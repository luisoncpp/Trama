# Filtered Contents ordinals must stay document-global

**What to know before changing Contents filters, reveal, or directive mutations**

Contents filters are presentation-only. The parser and the Quill Delta scan must still increment the ordinal for every heading, page break, and spacer in document order, even when a page-break or spacer row is hidden by a filter. Otherwise a visible heading's filtered-array index points to the wrong Quill item, and an edit can label the wrong directive.

Use ordinal as a stable document identity, never as a visible-row index. When a source-only blank-line spacer needs a label, apply the same document-global ordinal in the source fallback, then replace the blank run with one canonical spacer comment. This keeps parser, Quill, and source mutation aligned.

**Files:** `src/features/project-editor/document-contents/private/document-headings-parser.ts`, `src/features/project-editor/document-contents/private/quill-heading-reveal.ts`, `src/features/project-editor/document-contents/private/document-layout-label.ts`, `tests/document-contents-parser.test.ts`
