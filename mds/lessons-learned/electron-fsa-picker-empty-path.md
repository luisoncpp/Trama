# Electron File System Access API returns empty paths for staging pickers

When using `window.showOpenFilePicker` / `showDirectoryPicker` in the Trama renderer, `webUtils.getPathForFile(file)` (even via preload) returns an empty string for files from `FileSystemFileHandle.getFile()`.

Symptom: UI flows that need absolute disk paths (AI export staging basket, relative path hardening under `projectRoot`) silently add nothing — no IPC error, no console error.

Fix: open pickers in the main process with `dialog.showOpenDialog({ defaultPath: projectRoot, ... })` and return `filePaths` over IPC (`trama:ai:export:pick-staging`).

See `electron/services/ai-export-pick-service.ts` and `mds/architecture/ai-import-export-architecture.md`.
