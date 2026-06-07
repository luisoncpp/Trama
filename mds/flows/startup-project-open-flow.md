# Startup Project Open Flow

## Trigger

The app mounts `useProjectEditor()` on startup and no project is currently loaded.

## Entry point

`useAutoPickProjectFolderEffect()` in `src/features/project-editor/use-project-editor.ts`.

## Why this flow matters

Startup no longer always opens the native folder picker first. Trama now tries to reopen the last successfully opened project, but only if the remembered path still exists and still contains the required project folders (`book`, `outline`, `lore`). If not, startup falls back to the same folder picker flow used on first run.

## Sequence

1. `useProjectEditor()` restores persisted UI state and reads `trama.last-project.v1` through `useLastProjectState()`.
2. `useAutoPickProjectFolderEffect()` runs once when preload is available and `rootPath` is still empty.
3. The effect calls `restoreLastProjectOrPickFolder()` in `src/features/project-editor/startup-project-open.ts`.
4. If there is no remembered root, the helper calls `pickProjectFolder()` immediately.
5. If there is a remembered root, renderer asks main process to validate it through `window.tramaApi.validateProjectFolder({ rootPath })`.
6. `handleValidateProjectFolder()` in `electron/ipc/handlers/project-handlers/project-folder-dialog-handler.ts` reuses the same required-folder rule as the native picker flow.
7. Decision branch:
   - valid remembered root -> `openProject(lastProjectRootPath)`
   - invalid/missing structure -> clear the remembered root and call `pickProjectFolder()`
8. Successful `openProject()` persists the root again from `applyOpenedProject()` in `project-editor-private/open-project.ts`.

## Reads

| Source | Purpose |
|------|------|
| `localStorage['trama.last-project.v1']` | Remembered last successful project root |
| filesystem `book/`, `outline/`, `lore/` | Required structure validation |

## Writes

| Target | When |
|------|------|
| `localStorage['trama.last-project.v1']` | After successful `openProject()` |
| `localStorage['trama.last-project.v1']` removal | When startup validation fails |

## Side effects

1. Valid remembered projects skip the folder dialog.
2. First run still opens the picker immediately.
3. Deleted or malformed remembered roots recover in one launch instead of retrying forever.

## Files to inspect

| File | Role |
|------|------|
| `src/features/project-editor/use-project-editor.ts` | Startup effect |
| `src/features/project-editor/startup-project-open.ts` | Restore-vs-picker helper |
| `src/features/project-editor/use-last-project-state.ts` | Last-project persistence |
| `src/features/project-editor/project-editor-private/open-project.ts` | Persists successful root on project open |
| `electron/ipc/handlers/project-handlers/project-folder-dialog-handler.ts` | Shared folder validation + picker flow |
| `src/shared/ipc.ts` | Validation IPC contract |

## Common failure modes

1. Startup always shows the picker.
   - Check whether `trama.last-project.v1` was written after the last successful open.

2. Startup keeps retrying a bad path every launch.
   - Check that invalid validation clears the stored key before picker fallback.

3. Validation works in main but not renderer.
   - Verify `src/shared/ipc.ts`, `electron/ipc.ts`, handler exports, `electron/preload.cts`, and `src/types/trama-api.d.ts` were all updated.

## Focused tests

1. `npm run test -- tests/startup-project-open.test.ts`
2. `npm run test -- tests/project-folder-dialog-handler.test.ts`
3. `npm run test -- tests/use-project-editor.test.ts`
