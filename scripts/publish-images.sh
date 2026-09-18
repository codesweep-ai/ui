#!/usr/bin/env bash
# Publish npm package tarballs as container images, one image per package
# version: <registry>/<scope>/npm/<name>:<version>. Those images let a team of AI
# coding agents install builds that are not yet meant for people. The CI build
# runs this script after each commit on main, so a person seldom needs to.
#
# cs-npmrevs builds each image from the tarball alone, as an OCI archive, and
# podman pushes it. Nothing is carried forward from an earlier image, so each
# build publishes only what it made, and retention is a matter of deleting old
# tags.
#
#   publish-images.sh [--dry-run] <package dir or .tgz>...
#
# A version the registry already holds with the same integrity is skipped, which
# makes a re-run safe. One it holds with different bytes stops the run: a
# version is never rebuilt, so different bytes under one tag would mean two
# builds claim one version.
#
# podman reads and pushes with whatever credential it already has, so log in
# first:
#
#   echo "$TOKEN" | podman login ghcr.io -u "$USER" --password-stdin
#
# The same file is in every project that publishes images, so a fix made in one
# is copied to the others rather than rewritten there.
set -euo pipefail

# The command that runs cs-npmrevs, such as "go tool cs-npmrevs".
NPMREVS="${NPMREVS:-cs-npmrevs}"
# The registry the images go to.
REGISTRY="${REGISTRY:-ghcr.io}"

dry=""
if [ "${1:-}" = "--dry-run" ]; then
  dry=1
  shift
fi
[ "$#" -gt 0 ] || { echo "usage: publish-images.sh [--dry-run] <package dir or .tgz>..." >&2; exit 2; }

# A registry on this machine answers plain HTTP, as cs-npmrevs assumes of one, and
# podman refuses that unless told.
tls=()
case "$REGISTRY" in
localhost:* | 127.* | "[::1]":*) tls=(--tls-verify=false) ;;
esac

command -v podman >/dev/null ||
  { echo "publish-images.sh: podman is not installed, and it reads and pushes the images" >&2; exit 1; }

work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT

# The commit these builds come from, which each image records as
# org.opencontainers.image.revision. Outside a git work tree there is none.
rev="$(git rev-parse HEAD 2>/dev/null || true)"

for input in "$@"; do
  if [ -d "$input" ]; then
    # An absolute path: npm reads a bare word such as `pkg` as a package on the
    # registry rather than as the directory of that name.
    tgz="$work/$(npm pack "$(cd "$input" && pwd)" --pack-destination "$work" --silent | tail -1)"
  else
    tgz="$input"
  fi
  # shellcheck disable=SC2086 # NPMREVS may be a command with arguments
  ref="$($NPMREVS image build "$tgz" --registry "$REGISTRY" ${rev:+--revision "$rev"} -o "$work/image.tar" -q)"
  # shellcheck disable=SC2086
  want="$($NPMREVS image inspect "$tgz" --json | sed -n 's/.*"integrity": *"\([^"]*\)".*/\1/p' | head -1)"

  # Whether the registry holds this version already is asked by pulling it, so
  # it is asked with the credential the push will use. A registry refuses to
  # show a private image to a caller it would also refuse the push to.
  if podman pull -q ${tls[@]+"${tls[@]}"} "$ref" >/dev/null 2>"$work/pull.err"; then
    have="$(podman image inspect --format '{{index .Annotations "ai.codesweep.npm.integrity"}}' "$ref")"
    podman rmi -f "$ref" >/dev/null
    if [ "$have" = "$want" ]; then
      echo "$ref: already published with these bytes; skipping it"
      continue
    fi
    echo "publish-images.sh: $ref is already published with different bytes." >&2
    echo "A version is built once. Publish the change under a new version." >&2
    exit 1
  elif ! grep -qiE 'manifest unknown|name unknown|not found|denied|unauthorized|40[134]' "$work/pull.err"; then
    cat "$work/pull.err" >&2
    exit 1
  fi

  if [ -n "$dry" ]; then
    echo "$ref: would push ($want)"
    continue
  fi
  echo "$ref: pushing"
  # podman loads the archive under the reference cs-npmrevs named it for. It
  # recompresses the layer as it pushes, so the registry shows another digest
  # than the build computed, and the npm integrity the image carries is what
  # identifies the tarball.
  podman load -q -i "$work/image.tar" >/dev/null
  podman push -q ${tls[@]+"${tls[@]}"} "$ref"
  podman rmi -f "$ref" >/dev/null
done
