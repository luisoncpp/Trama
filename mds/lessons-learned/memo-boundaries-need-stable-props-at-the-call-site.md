# Memo Boundaries Need Stable Props At The Call Site

## What to know

Wrapping a shell component in `memo(...)` does not help if the parent still feeds it fresh object or callback identities every render.

For the project editor typing-churn slice, `ProjectEditorSidebarShell` only stopped re-rendering during typing after all shell-facing props were stabilized at the call site:

- shell state narrowed to a memoized slice
- shell actions narrowed to a memoized slice
- top-level spellcheck handlers made stable in `App`
- import/export open handlers made stable in the view

The same rule applied to dialogs: the memo boundary only held after the dialog hook outputs were repackaged into stable memoized objects before being passed into `ProjectEditorDialogs`.

## Why it matters

Typing changes the `useProjectEditor()` model every render by design. If a shell boundary receives fresh wrappers like `() => setOpen(true)` or fresh aggregated hook return objects, that boundary still re-renders even when it does not care about editor text.

The real optimization is not "add memo". It is "feed memoized children stable props whose identities only change when their own semantic inputs change."

## Where this applied

- `src/app.tsx`
- `src/features/project-editor/project-editor-shell.tsx`
- `src/features/project-editor/project-editor-shell-props.ts`
- `src/features/project-editor/project-editor-view.tsx`
- `src/features/project-editor/project-editor-view-dialogs.ts`
- `src/features/project-editor/project-editor-dialogs.tsx`

## Debug checklist

1. Confirm the child is actually wrapped in `memo(...)`.
2. Inspect every prop passed from the parent for inline closures, fresh arrays, or fresh aggregated objects.
3. Memoize narrowed prop bundles at the boundary, not just inside the child.
4. In tests, avoid mocking the memoized wrapper itself if you want to observe whether the boundary held.
