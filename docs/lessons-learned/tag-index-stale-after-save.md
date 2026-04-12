# Tag Index Stale After Save

## Symptom

After editing frontmatter tags from the sidebar dialog, Ctrl/Cmd+Click tag navigation did not pick up the new tags until app restart.

## Root Cause

Document save flows reconciled only the project index (`IndexService`) but did not rebuild the active in-memory tag index (`TagIndexService`) used by `getTagIndex` and `tagResolve`.

## Fix

- Update `reconcileActiveProjectIndex` in `electron/ipc/handlers/project-handlers/document-handlers.ts` to rebuild both:
  - `IndexService.reconcileIndex(...)`
  - `TagIndexService.buildIndex(...)`
- Keep renderer-side immediate refresh trigger so UI refetches tag index after successful tag edits.

## Regression Coverage

Added `tests/tag-index-ipc-regression.test.ts`:

1. `saveDocument` with new tags updates `handleTagGetIndex` and `handleTagResolve` immediately.
2. `saveDocument` removing tags clears stale tag resolution immediately.

## Guardrail

Any write path that can affect tags must refresh both persisted index state and the active in-memory tag index before returning success.
