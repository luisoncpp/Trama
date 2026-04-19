## Documentation update requirements (mandatory)

Before updating docs, read `docs/schema.md` to understand the folder structure and which file types belong where.

Files directly in `docs` are meant be immutable(DON'T CHANGE THEM when updating the documentation), and files on any of `docs`'s subfolders are expected to be changed constantly.

Minimum required updates:
1. `docs/live/file-map.md` — register new TS/TSX files with their responsibility
2. `docs/lessons-learned/` — add entry if a counter-intuitive fact or effective strategy was discovered during the change
3. `docs/live/current-status.md` — only if feature status or scope changed
4. Task-specific doc — create in the appropriate subfolder per `schema.md`

## Where to create new documentation

Use `docs/schema.md` as the definitive guide. Quick reference:

| What | Where |
|------|-------|
| User-facing feature behavior + acceptance criteria | `docs/spec/` |
| Implementation guide for a feature being built | `docs/plan/` |
| Canonical subsystem design (IPC, split pane, export pipeline) | `docs/architecture/` |
| Counter-intuitive facts / effective strategies discovered during implementation | `docs/lessons-learned/` |
| Live status (what's done, what's next) | `docs/live/current-status.md` |
| File ownership registry | `docs/live/file-map.md` |
| Build/test/dev commands and checklist | `docs/dev-workflow.md` |
| Runtime issues and recovery steps | `docs/live/troubleshooting.md` |

## Required depth

Do not update docs with shallow content. Required per change:

1. Explain data flow end-to-end (where data originates, transforms, and is consumed).
2. List exact files by responsibility (main process, IPC, renderer, tests).
3. Document invariants and non-obvious rules (or add to `docs/lessons-learned/` if counter-intuitive).
4. Add a fast debug playbook with ordered steps and focused tests.

## Architecture documentation gap

When working on any subsystem, if no architecture doc exists, create one in `docs/architecture/` as part of the change. This is not optional — it is the gap the schema is meant to close.

The rule: every subsystem with more than 3 files in its feature area needs an architecture doc.

## PR/handoff quality gate

1. A future contributor should be able to localize subsystem entry points in under 5 minutes using docs only.
2. A future contributor should be able to run a focused regression suite without codebase-wide search.
3. If the changed area had no architecture doc before, one must be created.

If these conditions are not met, documentation is incomplete.

## Documentation update protocol

Expected protocol when asked to "update docs":

1. Read `docs/schema.md` first.
2. Create or update the appropriate doc type in the correct folder.
3. Update `docs/START-HERE.md` fast-routing table so the new doc is discoverable.
4. Add entry to `docs/lessons-learned/` for every counter-intuitive fact or effective strategy discovered. Any fact that required to analyze multiple files and reason for several paragraphs can be considered counter-intuitive.
5. Include focused test commands for the changed subsystem.
6. Verify links are reciprocal: spec → architecture → implementation plan → troubleshooting → lessons.
