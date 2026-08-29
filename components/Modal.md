---
name: Modal
status: stable
since: 1.0.0
summary: Dialog overlay for confirmations, forms, or detail views. Provides a backdrop, scrollable content area, header with close button, and optional footer actions.
keywords: [modal, dialog, overlay, popup, lightbox, confirm, confirmation, alert dialog,
           drawer, sheet, portal, focus trap, backdrop, dismiss]
use_when:
  - Asking for user confirmation before a destructive or irreversible action
  - Presenting a form or detail view without navigating away
  - Blocking the background while the user completes a focused task
avoid_when:
  - Inline expandable content → Panel or Card
  - Persistent side panel → Panel or SplitPane
related: [Button, Panel]
---

# Modal

> Dialog overlay for confirmations, forms, or detail views.

## Props

```typescript
interface ModalProps {
  /** Modal title */
  title: string;
  /** Content (React node or string) */
  children: React.ReactNode;
  /** Footer action buttons */
  actions?: React.ReactNode;
  /** Called when modal is dismissed */
  onClose: () => void;
  /** Maximum width */
  maxWidth?: string;
  /** Additional class name merged onto the backdrop root */
  className?: string;
  /** Preferred element to focus on open. */
  initialFocus?: React.RefObject<HTMLElement | null>;
}
```

Modal portals to `document.body`, uses a unique `useId()` title relationship, and makes background content inert/`aria-hidden` until it closes.

## Visual Spec

### Layout
- Backdrop: `position: fixed`, `inset: 0`, `display: flex`, `align-items: flex-start`, `justify-content: center`.
- Dialog: `margin-top: 5vh`, `max-height: 80vh`, `display: flex`, `flex-direction: column`.

### Backdrop Styling
- Background: `rgba(0, 0, 0, 0.5)`.
- `z-index: 200`.
- `backdrop-filter: blur(2px)` (subtle, optional).

### Dialog Styling
- Max-width: `700px` (default), overridable via `maxWidth` prop.
- Width: `calc(100% - var(--space-6))` (ensures side margins on small screens).
- Background: `var(--card)`.
- Border: `1px solid var(--border)`.
- Border-radius: `var(--radius-lg)`.
- Shadow: `var(--shadow-lg)`.
- Overflow: `hidden`.

### Header
- `display: flex`, `align-items: center`, `justify-content: space-between`.
- Padding: `var(--space-4)`.
- Border-bottom: `1px solid var(--border)`.
- Title: `font-weight: var(--font-weight-semibold)`, `font-size: var(--font-size-md)`.
- Close button: right-aligned, `X` icon (18px), ghost button style.

### Content
- `overflow-y: auto`, `flex: 1`.
- Padding: `var(--space-4)`.
- `min-height: 0` (for flex overflow).

### Footer
- Padding: `var(--space-3) var(--space-4)`.
- Border-top: `1px solid var(--border)`.
- `display: flex`, `justify-content: flex-end`, `gap: var(--space-2)`.

### States
| State          | CSS                                           |
|----------------|-----------------------------------------------|
| Opening        | Fade in backdrop, scale-in dialog (optional animation) |
| Open           | Full opacity, normal scale                    |
| Closing        | Reverse of opening animation                  |
| Close btn hover | `background: var(--color-bg-muted-hover)`, `border-radius: var(--radius-sm)` |

### Responsive
- Dialog width constrained by `calc(100% - var(--space-6))`.
- On small screens, dialog is near-full-width with margins.

## Behavior

### Interactions
- **Backdrop click**: Calls `onClose()`.
- **Close button click**: Calls `onClose()`.
- **Escape key**: Calls `onClose()`.

### Focus Management
- On open: Focus is trapped inside the modal (tab cycles within modal elements).
- On open: `initialFocus.current` receives focus when supplied; otherwise the first focusable element (normally the close button) receives focus.
- On close: Focus returns to the element that triggered the modal.

### Keyboard
| Key     | Action                          |
|---------|---------------------------------|
| Escape  | Close modal                     |
| Tab     | Cycle through focusable elements within modal |
| Shift+Tab | Reverse cycle through focusable elements |

### Accessibility
- Dialog: `role="dialog"`, `aria-modal="true"`, `aria-labelledby={titleId}`.
- Title: `id={titleId}` for labelling.
- Close button: `aria-label="Close dialog"`.
- Background page regions are made inert and `aria-hidden` while the dialog is mounted; the backdrop itself remains the pointer-dismiss target.
- Body scroll lock: `document.body.style.overflow = "hidden"` while modal is open.

## Persistence

None.

## Dependencies

- `lucide-react`: `X` icon.
- `cn()` utility for className merging.

## Edge Cases

- **No actions**: Footer section is not rendered.
- **Very long content**: Content scrolls within the modal; header and footer remain fixed.
- **Nested modals**: Not recommended. If needed, z-index stacks (+10 per level).
- **No focusable elements in content**: Close button receives focus.
- **Rapidly opening/closing**: Animation should complete or be cancelled gracefully.

## Traceability

- Backdrop overlay: `data-component="Modal"`.
- Dialog surface: `data-modal-dialog`.
- Content region: `data-modal-content`.
- Title: `data-modal-title`.
- Close button: `data-modal-close`.

## Compiling usage example

<!-- docs-compile -->
```tsx
import { Modal } from "@codesweep-ai/ui";
export function Example() { return <Modal title="Confirm run" onClose={() => {}}>Start the scan?</Modal>; }
```
