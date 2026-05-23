# Revert Needs Force-Apply When Disk Content Is Text-Identical

## What to remember

Reloading a document from disk is not always the same problem as syncing a new `value` prop into Quill.

If the user types, then clicks revert before the debounce fires, two things can be true at once:

- the live Quill DOM already contains the unsaved text
- the parent pane state still contains the last clean disk markdown

After the revert IPC read, the parent pane state may still receive that same clean disk markdown string again. A pure value-equivalence sync will treat that as "nothing changed" and skip re-applying it, leaving the dirty Quill DOM visible even though pane state is now clean.

## Effective pattern

For true disk reload flows (`revert`, external reload, or any future explicit reload-from-disk action):

1. Flush the live editor first, so pending debounce work is collapsed while the current editor instance still exists.
2. Increment an explicit pane-local reload token/version in pane state when the disk content is loaded.
3. Feed that version into editor external sync so real disk reloads force one in-place re-apply even when the markdown string is text-identical.

In Trama this is:

- `PaneWorkspace.loadPaneDocument()` increments `pane.reloadVersion`
- `EditorPanel` passes `forceApplyVersion={reloadVersion}`
- `useSyncExternalValue()` force-applies the disk value when that version advances, while preserving selection and scroll

## Why this is better than trying to outsmart equality

This keeps the contract explicit:

- value equality is still used for normal external sync
- disk reloads have their own explicit apply signal

That avoids piling special-case exceptions into canonical value comparison logic that is already responsible for image placeholder equivalence, and it avoids the flicker and scroll reset that came from remounting Quill.
