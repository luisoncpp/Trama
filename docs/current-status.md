# Current Status (Phase 2 Kickoff)

## Product state

The repository is in a Phase 2 kickoff state. Core file-first foundations are working, but advanced writing workflows are still pending.

Implemented now:
- Electron + Vite + Preact desktop shell.
- Secure-by-default window config with one tradeoff (`sandbox: false`).
- Typed IPC with Zod validation and envelope responses.
- Native folder picker and project open flow.
- Recursive markdown scan with ignored system/build folders.
- Markdown read/save through main process repository layer.
- YAML frontmatter parse/serialize using `yaml` package.
- `.trama.index.json` reconciliation (prune missing references + append new files).
- External file watcher events and dirty-vs-external conflict prompt.
- Refactored renderer feature structure (`project-editor` hook + view/components split).
- Rich markdown visual editor (formatted editing surface, markdown persisted).
- Native right-click context menu with spellcheck suggestions.

Not implemented yet (planned in later Phase 2+):
- Save-as-copy action for conflict flow.
- Full compare/diff conflict UX.
- File operations beyond read/save (create/rename/delete workflows).
- Wiki links, templates, corkboard DnD, AI import/export pipeline.

## Reliability status

Current verification baseline:
- `npm run build` passes.
- `npm run test` passes.
- Tests cover startup config, IPC contract, frontmatter behavior, index reconciliation, and project-editor hook/logic smoke behavior.

## Known technical tradeoffs

- `sandbox: false` remains enabled for preload stability in this setup.
- IPC project handlers still perform some repeated scan/meta refresh work after save (acceptable for kickoff, likely optimize later).
- External change handling currently favors safety over convenience (blocks refresh if local document is dirty).

## Suggested next milestones

1. Finish Phase 2 editing loop safety:
- Add save-as-copy and compare actions in conflict resolution.
- Add create document flow and tree refresh UX around it.

2. Improve editor capabilities:
- Improve rich editor UX polish (layout density, accessibility, keyboard flow).
- Expand markdown fidelity coverage (edge cases in markdown/html roundtrip).

3. Performance and architecture cleanup:
- Reduce repeated full-project scans during save/index updates.
- Add project integration tests for external file event scenarios.
