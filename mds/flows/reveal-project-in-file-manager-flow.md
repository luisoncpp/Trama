# Reveal Project in File Manager Flow

## Trigger

User right-clicks the project-root breadcrumb above the sidebar filter and clicks **Show in File Explorer** (Windows/Linux) or **Reveal in Finder** (macOS).

## Entry point

`sidebar-scope-path-breadcrumb.tsx:48` — the breadcrumb button's `onContextMenu` handler.

## Sequence

1. `SidebarScopePathBreadcrumb` captures the right-click via `useSidebarProjectRootContextMenu`, which stores `{ x, y }` position in local state (`use-sidebar-project-root-context-menu.ts:22`).
2. `SidebarProjectRootContextMenu` renders at the mouse position. The label is platform-sensitive: `navigator.platform` check at `sidebar-project-root-context-menu.tsx:4` returns **"Reveal in Finder"** on Mac, **"Show in File Explorer"** everywhere else.
3. User clicks the menu item → `onRevealInFileManager` fires → `handleRevealInFileManager` closes the menu and calls the action (`use-sidebar-project-root-context-menu.ts:33`).
4. Action consumption:
   - `sidebar-scope-path-breadcrumb.tsx:40` consumes `revealInFileManager` via `useEditorActions()`
   - `use-sidebar-project-root-context-menu.ts` also reads `revealInFileManager` from the editor actions context
   - No prop drilling — the action is accessed directly through the stable Preact context facade
5. `revealProjectInFileManager()` (`sidebar-file-actions/private/project-reveal.ts:3`):
   - Guards: no-op if `rootPath` is empty; errors if `window.tramaApi.revealProjectInFileManager` is missing
   - Calls `window.tramaApi.revealProjectInFileManager({ rootPath })` via typed IPC
6. Preload bridge (`preload.cts:104`): `ipcRenderer.invoke(IPC_CHANNELS.revealProjectInFileManager, payload)`
7. Main process handler (`project-reveal-handler.ts:10`):
   - Validates payload with Zod schema
   - Resolves `rootPath` to absolute via `resolveProjectRoot` (`shared.ts:56`) — confirms directory exists
   - Calls `electron shell.openPath(projectRoot)` — OS opens file manager at the folder
   - Returns `{ ok: true, data: { rootPath } }` or error envelope
8. On success: status bar shows **"Project folder opened in file explorer."** (`project-editor-strings.ts:14`).

## Channel

| Property | Value |
|----------|-------|
| IPC channel | `trama:project:reveal-in-file-manager` (`ipc-channels.ts:6`) |
| Request schema | `revealProjectInFileManagerRequestSchema` (`ipc-project.ts:20`) — `{ rootPath: string }` |
| Response schema | `revealProjectInFileManagerResponseSchema` (`ipc-project.ts:21`) — `{ rootPath: string }` |

## State reads

| Kind | Source | Why |
|------|--------|-----|
| Project root path | `projectState.rootPath` | The path to reveal in the OS file manager |
| hasProject | Derived from `rootPath.trim()` | Disables the menu item when empty |

## State writes

| Target | File / layer | What changes |
|--------|--------------|--------------|
| Status message | `project-editor-strings.ts` | Set to success/error message in the status bar |
| Context menu position | `use-sidebar-project-root-context-menu.ts` | Cleared to `null` (menu dismissed) |

## Side effects

- OS file manager window opens at the project root directory
- IPC request/response round-trip (renderer → main → renderer)

## Platform differences

| Platform | Menu label | OS action |
|----------|------------|-----------|
| Windows | Show in File Explorer | `shell.openPath()` opens Explorer |
| macOS | Reveal in Finder | `shell.openPath()` opens Finder |
| Linux | Show in File Explorer | `shell.openPath()` opens default file manager |

## Files to inspect

| File | Why inspect it |
|------|----------------|
| `src/features/project-editor/components/sidebar/sidebar-scope-path-breadcrumb.tsx` | Trigger — right-click on breadcrumb |
| `src/features/project-editor/components/sidebar/sidebar-project-root-context-menu.tsx` | Context menu component with platform label |
| `src/features/project-editor/components/sidebar/use-sidebar-project-root-context-menu.ts` | Hook managing position state and handler wiring; consumes `revealInFileManager` from context |
| `src/features/project-editor/sidebar-file-actions/private/project-reveal.ts` | Action: guards + tramaApi call |
| `src/features/project-editor/project-editor-actions-context.tsx` | Stable Preact context providing `useEditorActions()` |
| `electron/preload.cts` | Preload bridge: ipcRenderer.invoke |
| `electron/ipc-features.ts` | Handler registration |
| `electron/ipc/handlers/project-handlers/project-reveal-handler.ts` | Main process handler: shell.openPath |
| `electron/ipc/handlers/project-handlers/shared.ts` | `resolveProjectRoot` — path resolution + directory check |
| `src/shared/ipc-channels.ts` | Channel name constant |
| `src/shared/ipc-project.ts` | Request/response Zod schemas |
| `src/features/project-editor/project-editor-strings.ts` | UI strings |
| `tests/sidebar-project-root-context-menu.test.ts` | Regression coverage |

## Common failure modes

| Symptom | Usual cause | First file to inspect |
|---------|-------------|-----------------------|
| "Preload API unavailable" message | `window.tramaApi.revealProjectInFileManager` not exposed | `electron/preload.cts` |
| "Invalid payload" error | Schema validation failed — rootPath missing or malformed | `shared/ipc-project.ts` |
| "Selected path is not a directory" error | rootPath points to a file, not a directory | `shared.ts` (`resolveProjectRoot`) |
| Nothing happens on click | `shell.openPath` returned an error string silently | `project-reveal-handler.ts:21` |
| Wrong platform label shown | `navigator.platform` check failed (very old/spoofed UA) | `sidebar-project-root-context-menu.tsx:4` |

## Focused tests

```bash
npm run test -- tests/sidebar-project-root-context-menu.test.ts
```

## Related docs

- `mds/flows/folder-delete-flow.md` — similar right-click → IPC → OS action pattern
- `mds/architecture/sidebar-path-scoping-model.md` — how root path relates to sidebar scope
