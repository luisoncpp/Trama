# Save Document Flow

## Trigger

User clicks the diskette save button in the rich editor toolbar.

## Entry point

`saveNow(pane?)` in `src/features/project-editor/workspace-actions.ts`, wired through pane-local toolbar callbacks.

## Why this flow matters

Save is the user-visible boundary between dirty pane state and persisted markdown on disk. The toolbar state must stay aligned with the pane's dirty flag so the diskette button is disabled and grayed out when no save is needed, and enabled only when unsaved changes exist.

## Sequence

1. `EditorPanel` derives `saveDisabled` from `!selectedPath || saving || !isDirty`.
2. `RichMarkdownEditor` forwards `saveDisabled` and `saveLabel` into `useSyncToolbarControls()`.
3. `RichEditorToolbarController.syncDocumentControls()` updates the toolbar save button (`.ql-save-changes`).
4. The controller syncs `disabled`, `title`, and `aria-label` without replacing the icon markup.
5. Clicking the enabled diskette button calls `onSaveNow`.
6. In split mode, `PaneEditor` passes explicit pane identity: `actions.saveNow(pane)`.
7. `saveNow(pane?)` resolves the target pane and calls `paneWorkspace.savePaneIfDirty(targetPane)`.
8. `PaneWorkspace` flushes the pane's debounced editor serialization ref, then saves the latest content.
9. After a successful save, the pane is marked clean and the toolbar save button returns to the disabled gray state.

## Button state matrix

| Condition | `saveDisabled` | Button appearance |
|-----------|----------------|-------------------|
| No file selected | `true` | Disabled, gray diskette |
| File selected, clean | `true` | Disabled, gray diskette |
| File selected, dirty | `false` | Enabled diskette |
| Save in progress | `true` | Disabled, gray diskette |

## State reads

| Kind | Source | Why |
|------|--------|-----|
| Selected file | `EditorPanel.selectedPath` | Save only makes sense for a loaded document |
| Dirty state | `EditorPanel.isDirty` | Controls enabled/disabled affordance |
| Saving state | `EditorPanel.saving` | Prevent duplicate clicks while save is in flight |
| Target pane | `PaneEditor` closure or active pane fallback | Ensures split-pane save hits the intended document |

## State writes

| Target | File / layer | What changes |
|--------|--------------|--------------|
| Toolbar save button | `rich-markdown-editor-toolbar-controller.ts` | `disabled`, `title`, and `aria-label` are synchronized |
| Pane dirty flag | `pane/pane-workspace.ts` | Cleared after successful save |
| Persisted document | repository layer via IPC | Markdown written to disk |

## Files to inspect

| File | Why inspect it |
|------|----------------|
| `src/features/project-editor/pane/editor-panel.tsx` | Computes `saveDisabled` from selected path, saving, and dirty state |
| `src/features/project-editor/pane/pane-editor.tsx` | Wires pane-explicit `saveNow(pane)` callback |
| `src/features/project-editor/pane/rich-markdown-editor/toolbar-private/rich-markdown-editor-toolbar-controller.ts` | Syncs save button disabled/label state |
| `src/features/project-editor/pane/rich-markdown-editor/toolbar-private/rich-markdown-editor-toolbar-dom.ts` | Creates and orders the diskette save button |
| `src/features/project-editor/pane/rich-markdown-editor/toolbar-private/rich-markdown-editor-toolbar-helpers.ts` | Defines the save diskette icon button markup |
| `src/features/project-editor/workspace-actions.ts` | Save action entry point |
| `src/features/project-editor/pane/pane-workspace.ts` | Flush + save + mark-clean coordinator |
| `tests/rich-markdown-editor-toolbar-zoom.test.ts` | Regression coverage for save icon render and disabled/enabled state |
| `tests/project-editor-conflict-flow.test.ts` | Regression coverage for pane-targeted save in split mode |

## Common failure modes

| Symptom | Usual cause | First file to inspect |
|---------|-------------|-----------------------|
| Save button looks like text instead of an icon | Toolbar DOM helper created the wrong element type | `rich-markdown-editor-toolbar-dom.ts` |
| Save icon disappears after sync | Toolbar controller replaced `textContent` instead of tooltip/aria state | `rich-markdown-editor-toolbar-controller.ts` |
| Save button enabled when document is clean | `saveDisabled` derivation drifted from pane dirty state | `editor-panel.tsx` |
| Clicking secondary save writes primary document | Pane identity was not passed explicitly | `pane-editor.tsx` |

## Focused tests

```bash
npm run test -- tests/rich-markdown-editor-toolbar-zoom.test.ts tests/project-editor-conflict-flow.test.ts
```

## Related docs

- `mds/architecture/editor-serialization-debounce-architecture.md`
- `mds/architecture/split-pane-coordination.md`
- `mds/flows/rich-editor-typing-flow.md`
- `mds/flows/rich-editor-revert-changes-flow.md`
