# Global find presets need a refresh after query commit

Date: 2026-07-09

## Context

Clicking a sidebar Search result posts a global find preset and navigates the active pane. The pane path changes before disk content finishes loading, so the rich editor can briefly have the requested `documentId` while Quill still contains old or empty content.

## Lesson

Do not treat the first `applySearch(query, options)` as authoritative when a preset comes from global search. If the local find bar was already open, the content-mutation refresh effect may run in the same effect flush as the preset, before the preset query has committed. If the target content applies during that window, a later refresh must be triggered by the query/options transition itself.

The visible active-match overlay also needs a post-reveal bounds refresh. `getBounds()` is layout-dependent, and an early read can be null or stale while the editor is settling after navigation.

## Rule

Global-search-to-local-find handoff should refresh matches on:

- matching document id / content-session change
- preset query and search-option changes
- editor enablement changes after loading
- content mutation notifications

After selecting/revealing a match, force one fresh bounds render so the highlight is based on settled Quill geometry.

