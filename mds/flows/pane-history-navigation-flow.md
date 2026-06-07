# Pane History Navigation Flow

## Trigger

The user opens another document in the current pane, or navigates back/forward with `Alt+Left`, `Alt+Right`, the application menu, or the toolbar back button.

## Entry points

- Non-history navigation: `selectFile()` in `src/features/project-editor/sidebar-file-actions/private/file-select.ts` and `openFileInPane()` in `src/features/project-editor/workspace-actions.ts`
- History navigation: `openPreviousInPaneHistory()` and `openNextInPaneHistory()` in `src/features/project-editor/workspace-actions.ts`

## Why this flow matters

Pane history is session-only and pane-local. It must behave like a browser history stack:
- back/forward moves the cursor without rewriting the stack
- opening a new document after going back truncates forward entries
- primary and secondary panes keep independent history chains

## Sequence

1. A non-history open happens from the sidebar or from tag-link navigation.
2. The caller resolves the target pane.
3. `PaneWorkspace.recordPaneNavigation(pane, path)` records the path for that pane:
   - if the path already matches the current history entry, do nothing
   - otherwise truncate everything after the current index
   - append the new path and move the index to the end
4. The layout path for that pane is updated.
5. If the target pane does not already have that document loaded, `loadDocument(path, pane)` reads it through IPC and loads it into the pane state.
6. Later, if the user triggers Back or Forward:
   - `openPreviousInPaneHistory()` or `openNextInPaneHistory()` asks `PaneWorkspace` for the adjacent path
   - if no adjacent entry exists, stop
   - move the history index by one step
   - reopen that path in the same pane without calling `recordPaneNavigation()`
7. `openProject()` resets pane history, reconciles the next layout, and seeds `primaryPath` / `secondaryPath` from that reconciled layout before loading documents, so the initially opened documents become the first history entries for the session.
8. When the project is cleared or reopened, `PaneWorkspace.clearNavigationHistory()` resets both pane stacks.

## Reads

| Kind | Source | Why |
|------|--------|-----|
| Active pane | `workspace.layout.activePane` | Default pane for shortcuts/menu commands |
| Current pane path | reconciled layout in `openProject()` and `workspace.layout.primaryPath` / `secondaryPath` | Seeds initial history and updates UI selection immediately |
| Loaded pane path | `workspace.primary.path` / `secondary.path` | Avoid redundant `loadDocument()` calls |
| Pane dirty state | `workspace.getPaneDocument(pane)` | Primary-pane history navigation still respects the dirty guard |
| History stack | `PaneWorkspace` injected navigation store | Decides previous/next availability and receives initial seeding during project-open |

## Writes

| Target | File / layer | What changes |
|--------|--------------|--------------|
| Pane history stack | `pane/pane-workspace.ts` | Append, truncate-forward, move cursor, or clear |
| `workspaceLayout.primaryPath` / `secondaryPath` | `workspace-actions.ts` / sidebar file select | Immediate pane assignment |
| `workspaceLayout.activePane` | `workspace-actions.ts` | Keeps navigation targeted to the pane being opened |
| Pane document state | `project-editor-private/actions.ts` | Async document load if the target doc is not already loaded |

## Side effects

| Side effect | File |
|-------------|------|
| Sidebar click saves dirty active pane before switching | `sidebar-file-actions/private/file-select.ts` |
| Tag click opens in secondary pane and records secondary history | `pane/workspace-editor-panels.tsx` + `workspace-actions.ts` |
| Alt+Left / Alt+Right dispatch pane history actions | `use-project-editor-shortcuts-effect.ts` |
| Menu bar Back / Forward dispatch workspace command bridge events | `electron/main-process/application-menu.ts` |
| Toolbar Back button calls pane history action directly | `pane/rich-markdown-editor/rich-markdown-editor-toolbar*.ts` |

## Files to inspect

| File | Why |
|------|-----|
| `src/features/project-editor/pane/pane-workspace.ts` | History stack storage and cursor movement |
| `src/features/project-editor/workspace-actions.ts` | Browser-like navigation rules for open/back/forward |
| `src/features/project-editor/sidebar-file-actions/private/file-select.ts` | Sidebar open path records pane history |
| `src/features/project-editor/use-project-editor.ts` | Stable history store injection |
| `src/features/project-editor/project-editor-private/open-project.ts` | Reset + initial seeding of pane history from reconciled layout |
| `src/features/project-editor/use-project-editor-shortcuts-effect.ts` | Alt+Left / Alt+Right handling |
| `electron/main-process/application-menu.ts` | Menu bar Back / Forward entries |
| `src/features/project-editor/pane/rich-markdown-editor/rich-markdown-editor-toolbar.ts` + `private/rich-markdown-editor-toolbar-controller.ts` | Toolbar back button wiring |
| `tests/pane-workspace.test.ts` | Stack truncation and pane isolation tests |
| `tests/use-project-editor.test.ts` | End-to-end action and shortcut coverage |

## Common failure modes

| Symptom | Usual cause | First file to inspect |
|---------|-------------|-----------------------|
| History disappears after a re-render | History state stored in a recreated helper instance instead of a stable ref | `use-project-editor.ts` |
| Back adds duplicate entries | History navigation path reused the regular `record` path | `workspace-actions.ts` |
| Forward still works after opening a new document from the middle of history | Forward entries were not truncated before append | `pane/pane-workspace.ts` |
| Both panes share the same history | Pane-local stacks not separated by pane key | `pane/pane-workspace.ts` |
| Back cannot reach the initially opened pane document after startup | History was reset during `openProject()` but not re-seeded from the reconciled layout | `project-editor-private/open-project.ts` |
| Alt+Left does nothing but the action works in tests | Shortcut guard swallowed the event or wrong key detection | `use-project-editor-shortcuts-effect.ts` |

## Focused tests

- `npm run test -- tests/pane-workspace.test.ts`
- `npm run test -- tests/use-project-editor.test.ts`
