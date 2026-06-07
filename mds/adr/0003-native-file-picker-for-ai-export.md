# Native File and Folder Picker for AI Export Staging Area

We decided to substitute the cramped internal file checkbox tree view inside the AI Export dialog with a two-button native invocation model (OS open-file / open-directory dialogs).

**Implementation note (2026-06):** The first renderer implementation used `window.showOpenFilePicker` / `showDirectoryPicker`, but Electron cannot resolve filesystem paths from `FileSystemFileHandle` (`webUtils.getPathForFile` returns `''`). Staging pickers therefore run in the main process via `dialog.showOpenDialog` (`trama:ai:export:pick-staging`) with `defaultPath: projectRoot`. The dialog UX (Add Files / Add Folder, basket chips) is unchanged. 

## Context and Decision
The original hierarchical checkbox list forced tedious manual toggling over large file counts and squeezed text layout boundaries. Building a fully multi-column custom file tree inside a modal component introduces severe code duplication and threatens file length constraints (`max-lines: 200`). By offloading selection mechanics (Shift-range selections, icon grids, OS-native searches) directly to the native host window shell, we preserve a clean, compact dialog footprint.

## Consequences
- Selected native assets pass through immediate Relative Path Hardening inside the renderer layer to guarantee foreign folders or files cannot pollute workspace state.
- Non-project elements or unmanaged branches are filtered out seamlessly based on root structural prefixes.
- Selections populate a wrapping, high-density Staging Basket chip list with keyboard arrow-pruning capabilities.
- Clears up screen clutter while remaining fully compliant with lint parameters and cascade ordering.
- This choice requires that `projectRoot` be available to the dialog shell for absolute prefix verification.
