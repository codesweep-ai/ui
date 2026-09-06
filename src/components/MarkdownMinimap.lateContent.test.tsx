import { useState } from "react";
import { describe, expect, it } from "vitest";
import { act, render } from "@testing-library/react";

import { MarkdownMinimap } from "./MarkdownMinimap";

// Browser mode, because the assertion reads pixels off a canvas and jsdom
// paints none: every count below would be 0 whether or not the minimap drew.
//
// The shape here is a minimap that outlives its content, which is what any
// viewer fetching a document looks like. While the component took a ref, the
// element arriving late was invisible to it: a ref keeps its identity when its
// `current` is filled in, so the effect keyed on it never ran again and the
// canvas stayed blank for good.
function LateContent() {
  const [content, setContent] = useState<HTMLDivElement | null>(null);
  const [loaded, setLoaded] = useState(false);

  return (
    <div>
      <button type="button" onClick={() => setLoaded(true)}>
        load
      </button>
      <MarkdownMinimap content={content} />
      {loaded && (
        <div ref={setContent} style={{ height: 200, overflow: "auto" }}>
          {Array.from({ length: 60 }, (_, i) => (
            <p key={i} style={{ margin: 8 }}>
              paragraph {i}, long enough to give the minimap a block to draw
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

function paintedPixels(root: HTMLElement) {
  const canvas = root.querySelector("canvas");
  if (!canvas) throw new Error("the minimap rendered no canvas");
  const image = canvas.getContext("2d")!.getImageData(0, 0, canvas.width, canvas.height);
  let painted = 0;
  for (let i = 3; i < image.data.length; i += 4) if (image.data[i] !== 0) painted += 1;
  return painted;
}

describe("MarkdownMinimap with content that mounts after it", () => {
  it("draws once the content arrives", async () => {
    const { container, getByText } = render(<LateContent />);
    expect(paintedPixels(container)).toBe(0);

    await act(async () => {
      getByText("load").click();
    });
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 600));
    });

    expect(paintedPixels(container)).toBeGreaterThan(0);
  });
});
