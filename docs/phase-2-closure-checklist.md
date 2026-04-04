# Phase 2 Closure Checklist

Goal: close remaining scope for "Phase 2: File System, Indexing, and Core Editing Loop" from DESIGN_SPEC.

Status: COMPLETED (2026-04-04)

Final outcome:
- Core scan/read/save/frontmatter/index loop implemented.
- External watcher flow implemented.
- Conflict-resolution depth completed (reload/keep/compare/save-as-copy).
- Integration coverage for autosave/conflict workflow added.
- Build/lint/test gates passing.

## PR 1 - Conflict Resolution UX Completion

Status: Completed

Objective:
- Complete conflict actions so the user can recover safely from external updates without forced discard.

Scope:
- Add "Save as copy" action from conflict banner.
- Add "Compare" action (at minimum side-by-side modal or inline diff summary).
- Keep current reload/keep actions, but clarify wording and outcomes.

Primary files:
- src/features/project-editor/components/conflict-banner.tsx
- src/features/project-editor/project-editor-types.ts
- src/features/project-editor/project-editor-strings.ts
- src/features/project-editor/project-editor-view.tsx
- src/features/project-editor/use-project-editor-ui-actions.ts
- src/features/project-editor/use-project-editor-state.ts

Likely IPC/backend additions (if Save as copy writes a new file):
- src/shared/ipc.ts
- src/types/trama-api.d.ts
- electron/preload.cts
- electron/ipc/handlers/project-handlers/document-handlers.ts
- electron/services/document-repository.ts

Acceptance criteria:
- External change while dirty shows actions: Reload, Keep, Save as copy, Compare.
- Save as copy persists local content into a new markdown file path.
- Compare shows clear difference between local dirty buffer and latest disk content.
- Choosing any conflict action clears conflict state consistently.

Result:
- Completed.

Validation:
- npm run lint
- npm run test
- Manual: dirty doc -> external change -> exercise each action.

## PR 2 - Save/Reload Conflict Integration Tests

Status: Completed

Objective:
- Add explicit integration coverage required by Phase 2 minimum tests.

Scope:
- Add tests for save/reload conflict workflow end-to-end at editor feature boundary.
- Cover at least:
  - dirty + external change + reload (local discarded)
  - dirty + external change + keep (local retained)
  - dirty + external change + save as copy (new file created, local preserved)
  - compare action opens expected UI state

Primary files:
- tests/use-project-editor.test.ts
- tests/rich-markdown-editor.test.ts
- tests/project-editor-logic.test.ts

Optional new test file:
- tests/project-editor-conflict-flow.test.ts

Acceptance criteria:
- Tests fail before implementation and pass after.
- Conflict flow behavior is asserted with clear state transitions.
- Existing tests remain green.

Result:
- Completed (autosave debounce + compare/save-as-copy/reload conflict paths covered in integration tests).

Validation:
- npm run test
- npm run build

## PR 3 - Phase 2 DoD Hardening and Sign-off

Status: Completed

Objective:
- Close remaining DoD gaps and capture final sign-off evidence in docs.

Scope:
- Reduce duplicated refresh/re-scan work in save path where practical.
- Ensure external event handling remains deterministic under burst changes.
- Update status docs from kickoff wording to phase 2 complete when criteria are met.

Primary files:
- electron/ipc/handlers/project-handlers/document-handlers.ts
- electron/services/index-service.ts
- electron/services/watcher-service.ts
- docs/current-status.md
- docs/implementation-overview.md
- docs/new-conversation-handoff.md

Acceptance criteria:
- No regression in open/edit/autosave flow.
- Conflict flows are complete and covered by tests.
- Docs explicitly mark Phase 2 as complete with known residual tradeoffs.

Result:
- Completed.

Validation:
- npm run lint
- npm run test
- npm run build
- Manual smoke: npm run dev and perform full conflict workflow.

## Completion Notes

Execution order completed:
1. PR 1 (features)
2. PR 2 (tests and confidence)
3. PR 3 (hardening + docs sign-off)

## Definition of done gate for Phase 2

Phase 2 completion gate (final check):
- Project open + markdown edit + autosave works.
- External update recovery offers safe user choices (not only discard/keep).
- Minimum tests include frontmatter, index reconciliation, and save/reload conflict integration.
- Build, lint, tests all pass.

Gate result:
- Passed.
