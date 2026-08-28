# Find shortcut scope must include the find bar sibling

Date: 2026-08-26

## What is counter-intuitive

The in-document find bar is rendered next to the Quill host, not inside it:

```
.rich-editor-shell
  .rich-editor          ← hostRef (Quill mounts here)
  .editor-findbar       ← sibling, not a host child
```

A find-shortcut listener that only treats `host.contains(event.target)` or `editor.hasFocus()` as in-scope will ignore `Ctrl/Cmd+F` once the local find input has focus. The editor no longer has focus, and the input is not inside the host.

## Why that matters

Un-prevented `Ctrl+F` can fall through to Chromium. Native find-in-page then owns the keyboard, so later `Ctrl+S` never reaches the workspace save handler — even though save is otherwise exempt from the form-field guard.

## Rule

Treat the pane's `.editor-findbar` as part of find-shortcut scope. Resolve it as a direct child of the host's parent (`:scope > .editor-findbar`) so split panes do not share each other's bars. Keep `Ctrl/Cmd+S` exempt from `isFormFieldTarget()` so save still works while typing a query.

## Files

- `src/features/project-editor/pane/rich-markdown-editor/rich-markdown-editor-view.tsx` — shell owns host + find bar
- `src/features/project-editor/pane/rich-markdown-editor/editor-session/editor-session-private/editor-session-find-focus.ts` — `isFindShortcutInScope()`
- `src/features/project-editor/pane/rich-markdown-editor/editor-session/editor-session-private/editor-session-find-hooks.ts` — `useFindShortcutEffect`
- `src/features/project-editor/use-project-editor-shortcuts-effect.ts` — form-field save exemption

## Focused tests

```bash
npm run test -- tests/rich-markdown-editor-find-regression.test.ts tests/workspace-keyboard-shortcuts.test.ts
```
