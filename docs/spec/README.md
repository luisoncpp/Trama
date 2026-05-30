# Spec Docs

Feature specifications — what the system should do from the user's perspective.

## Index

| File | Feature |
|------|---------|
| `map-document-markers-spec.md` | Map documents with image backgrounds, interactive markers, and tag-based navigation |
| `wiki-tag-links-spec.md` | Tag matching rules, navigation behavior, highlight conditions |
| `markdown-layout-directives-spec.md` | Layout directive syntax, rendering semantics, EPUB/MOBI mapping |
| `ai-import-format.md` | Clipboard format specification for AI import |
| `project-history-git-spec.md` | Local Git-backed snapshots, document revisions, preview, and restore behavior |
| `project-structure-template.md` | Project folder structure convention |

## When to add a doc here

- Before starting implementation of a new feature
- When defining acceptance criteria for user-facing behavior
- When specifying input/output contracts (API shapes, frontmatter schemas)

## Rules

- Specs describe intended behavior, not implementation details.
- Each spec has a paired implementation plan in `docs/plan/` (when active) or `docs/plan/done/` (when complete).
- Do not mix specification with implementation notes — use separate documents.
- Acceptance criteria go in the spec, not in the implementation plan.
