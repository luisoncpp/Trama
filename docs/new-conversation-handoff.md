# New Conversation Handoff

## Goal

Use this file to quickly bootstrap a fresh chat session and avoid rediscovering project context.

## 60-second summary

Trama is a file-first desktop writing tool. The codebase currently delivers a Phase 2 kickoff: open project folder, scan markdown files, edit/save documents with YAML frontmatter support, maintain index reconciliation, and react to external file changes with a basic conflict flow.

## Read first (in order)

1. `docs/current-status.md`
2. `docs/implementation-overview.md`
3. `docs/file-map.md`
4. `docs/ipc-architecture.md`
5. `docs/dev-workflow.md`
6. `docs/troubleshooting.md`

## Where to make common changes

Renderer editor behavior:
- `src/features/project-editor/use-project-editor.ts`
- `src/features/project-editor/use-project-editor-autosave-effect.ts`
- `src/features/project-editor/use-project-editor-external-events-effect.ts`
- `src/features/project-editor/project-editor-view.tsx`

IPC/backend behavior:
- `electron/ipc.ts`
- `electron/ipc/handlers/project-handlers/*`
- `electron/ipc-runtime.ts`
- `electron/services/*`

Shared contract:
- `src/shared/ipc.ts`
- `src/types/trama-api.d.ts`
- `electron/preload.cts`

## Quick sanity checks after any significant change

1. `npm run build`
2. `npm run test`
3. `npm run dev`
4. In the app:
- confirm preload API status is available,
- open a folder,
- edit/save a markdown file,
- verify no regressions in conflict behavior.

## Current high-value next tasks

1. Implement complete conflict actions (save as copy, compare/review).
2. Move from textarea to rich markdown editor.
3. Optimize project scan/reconciliation work triggered by save operations.
4. Expand tests for external file event flows and dirty-state safety.
