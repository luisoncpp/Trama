# START HERE - Documentation Entry Point

> **Last updated:** 2026-04-11. If this file drifts from reality, update it before doing anything else.

This file is the required first stop for new conversations.

Goal: avoid repeated codebase-wide searches and reduce drift between implementation and docs.

## 3-minute bootstrap

1. Read `docs/current-status.md` for implemented vs pending features.
2. Read `docs/file-map.md` for file ownership and where to edit.
3. Read `docs/lessons-learned/README.md` and any relevant lesson files.
4. Read `docs/dev-workflow.md` for build/test/checklist rules.

## Feature-specific maps

Open these only when relevant:

- IPC extension workflow: `docs/ipc-architecture.md`
- Phase planning details: `docs/phase-4-detailed-plan.md`
- Wiki Tag Links implementation plan: `docs/wiki-tag-links-implementation-plan.md`

## Fast routing by task

| Task | Open these files |
|------|-----------------|
| Add/change IPC channel | `src/shared/ipc.ts` → `electron/ipc.ts` → `electron/preload.cts` → `src/types/trama-api.d.ts` |
| Add/change IPC handler | `electron/ipc/handlers/` + `electron/ipc-handlers.ts` → `docs/ipc-architecture.md` |
| Change sidebar UX | `src/features/project-editor/components/sidebar/sidebar-types.ts` → target component in `sidebar/` |
| Change editor behavior | `src/features/project-editor/components/rich-markdown-editor*.ts*` |
| Change filesystem/repo layer | `electron/services/document-repository.ts` → `electron/ipc/handlers/project-handlers/document-handlers.ts` |
| Add a test | `tests/` + `docs/dev-workflow.md` (checklist) |
| Implement Wiki Tag Links (WS1) | `docs/wiki-tag-links-spec.md` → `docs/wiki-tag-links-implementation-plan.md` → `docs/phase-4-detailed-plan.md` |
| Understand feature status | `docs/current-status.md` → `docs/phase-4-detailed-plan.md` |
| Understand project structure | `docs/file-map.md` |
| Debug a runtime issue | `docs/troubleshooting.md` → `docs/lessons-learned/README.md` |

- Add or change IPC contract:
  - `src/shared/ipc.ts`
  - `electron/ipc.ts`
  - `electron/preload.cts`
  - `src/types/trama-api.d.ts`

- Change filesystem behavior:
  - `electron/services/document-repository.ts`
  - `electron/ipc/handlers/project-handlers/document-handlers.ts`

- Change sidebar UX:
  - `src/features/project-editor/components/sidebar/*`

- Change editor behavior:
  - `src/features/project-editor/components/rich-markdown-editor*.ts*`

## Anti-forget checks (required)

Before finalizing any implementation/doc change:

1. Confirm `docs/file-map.md` includes any new TS/TSX files.
2. Confirm relevant notes exist in `docs/lessons-learned/README.md` and add one if needed.
3. Confirm `docs/current-status.md` is still accurate for feature status.

## Why this exists

Repeated misses were happening because key docs were not consistently opened (`file-map.md`, `lessons-learned/README.md`).

If this file gets outdated, update it first and then update links in:
- `docs/README.md`
- `docs/new-conversation-handoff.md`
- `docs/dev-workflow.md`
- `docs/file-map.md`
