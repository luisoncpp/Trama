# Architecture Docs

Canonical technical guides — the single source of truth for each subsystem's design, data model, and behavior rules.

## Index

| File | Subsystem |
|------|-----------|
| `ipc-architecture.md` | IPC channel taxonomy, extension workflow, envelope pattern |
| `split-pane-coordination.md` | Per-pane state model, pane-targeted actions, layout persistence |
| `book-export-architecture.md` | Export pipeline: formats, renderers, directive mapping, image handling |

## When to add a doc here

- When a subsystem has more than 3 files and no architecture doc exists yet
- When a design decision needs to be recorded as the source of truth
- When creating an ADR (architecture decision record) for a major change

## Rules

- One file per subsystem — no duplicates across this folder.
- These are reference documents, not status trackers. Keep them stable.
- If implementation diverges from the architecture guide, update the guide first.
- Do not put status bullets or "in progress" content here.
