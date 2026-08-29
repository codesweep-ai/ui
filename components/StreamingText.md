---
name: StreamingText
status: stable
since: 1.4.0
summary: Live-rendered plain text that reveals characters at a configurable speed with a blinking trailing cursor, for streaming model output.
keywords: [streaming text, typewriter, token stream, live text, model output, llm output,
           character reveal, cursor, animated text, streaming, real-time, chat output]
use_when:
  - Rendering token-by-token model output as it streams from the backend
  - Showing live plain-text output below an AgentStatus row
avoid_when:
  - Static or completed markdown content → MarkdownViewer
  - Rendering inside a Modal (streaming output must not block UI)
related: [AgentStatus, AgentTrace, PulseBadge, MarkdownViewer]
patterns: [AgentActivity]
---

# StreamingText

> Live-rendered text that reveals characters at a configurable speed with a blinking trailing cursor. Use for streaming model output sitting below an [`AgentStatus`](./AgentStatus.md) row.

Added in `@codesweep-ai/ui@1.4.0`.

## Props

```typescript
interface StreamingTextProps {
  /** Full target string. Component reveals characters of this string over time. */
  text: string;
  /** Characters revealed per second. Default: 40 */
  speed?: number;
  /** When true, snap to full `text` and hide the cursor. Default: false */
  done?: boolean;
  /** Fires once after the last character is revealed. */
  onDone?: () => void;
  /** Hide the cursor even while streaming. Default: false */
  hideCursor?: boolean;
  /** Additional className. */
  className?: string;
}
```

## Visual Spec

- Font: inherits parent. The default wrapper sets `var(--font-size-sm)`, `var(--fg)`, `whitespace-pre-wrap`, `break-words`.
- Cursor: 2px wide, 1em tall, `var(--color-accent)`, blinks via the `cs-stream-cursor` keyframes (1s steps).
- `prefers-reduced-motion: reduce`: animation disabled; text snaps to full content and cursor holds steady.

## Behavior

### Streaming model

`text` is the *target*. When it grows (the consumer appends more tokens), the reveal animation continues from the current position. When `done={true}`, the component snaps to the full `text` and the cursor disappears.

```tsx
const [tokens, setTokens] = useState("");
const [done, setDone] = useState(false);

useEffect(() => {
  streamFromBackend({
    onToken: (t) => setTokens((s) => s + t),
    onDone: () => setDone(true),
  });
}, []);

<StreamingText text={tokens} done={done} />
```

### Speed

`speed` is in *characters per second*. The actual `setInterval` cadence is `max(8, floor(1000 / speed))` ms — so very high speeds clamp at ~125 cps (one char every 8ms) to stay under the React commit rate. `speed={0}` snaps to full immediately.

### `onDone`

Fires exactly once per `text` value, after the last character is revealed.

### Reduced motion

When `(prefers-reduced-motion: reduce)` matches, the reveal animation is skipped (initial state already at full length) and the cursor's blink animation is suppressed via CSS. This is the most common opt-out users have for chat-style UIs.

## Anti-patterns

- ❌ Don't wrap StreamingText in a Modal. Streaming output should never block the rest of the UI.
- ❌ Don't use StreamingText for static markdown. Use [`MarkdownViewer`](./MarkdownViewer.md) — `StreamingText` is for plain text only.
- ❌ Don't reset the parent's state on every token — make sure `text` is *appended* to, not replaced. Otherwise the reveal restarts from 0.

## Traceability

`data-component="StreamingText"`, `data-streaming="true"` while characters are still being revealed.

## Compiling usage example

<!-- docs-compile -->
```tsx
import { StreamingText } from "@codesweep-ai/ui";
export function Example() { return <StreamingText text="Inspecting dependencies…" />; }
```
