# Non-text editor surfaces should update pane meta directly

When a document's editable behavior lives in frontmatter instead of markdown body text, the renderer should update pane `meta` directly and let the existing `saveDocument(path, content, meta)` flow persist the change.

Why this matters:

- Trama already treats document body and frontmatter as separate state channels after `readDocument()`.
- Trying to re-embed YAML into `editorValue` creates a second serialization path and fights the current pane/save/revert model.
- A small pane action like `updateEditorMeta(meta, pane)` keeps dirty tracking, split-pane targeting, save, and revert behavior consistent for non-text editors.

Use this pattern for future alternative editor surfaces (maps, templates, structured boards) unless there is a concrete requirement to edit raw frontmatter text directly.
