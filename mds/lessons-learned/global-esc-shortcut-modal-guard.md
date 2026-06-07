# Global ESC shortcut needs modal dialog guard

## What is counter-intuitive

When adding a global `keydown` listener for `Escape` on `window`, the handler fires even when a modal dialog is open. The dialog's own ESC handler runs on the same `window` element, so `stopPropagation()` does not prevent the global handler from firing — only `stopImmediatePropagation()` would, but that's fragile across component boundaries.

## What to do

Query the DOM for `[aria-modal="true"]` before acting on ESC. All modal dialogs in this project set `aria-modal="true"` on their dialog content. If a dialog is open, skip the global ESC action so the dialog handler owns the interaction.

Also keep the existing `isFormFieldTarget` guard (skip when target is `<input>`, `<textarea>`, or `<select>`), which naturally handles the in-document find overlay ESC case (its input already consumes ESC via its own `onKeyDown`).

## Files

- `src/features/project-editor/use-project-editor-shortcuts-effect.ts:21-23` — `hasOpenModal()` helper
- `src/features/project-editor/use-project-editor-shortcuts-effect.ts:39-43` — ESC handler with modal guard

## Date

2026-04-24
