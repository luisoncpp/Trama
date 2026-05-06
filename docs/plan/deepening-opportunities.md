# Deepening Opportunities (archived)

Candidates 2–5 from the architecture review. Candidate 1 was selected for exploration; these are preserved for future reference.

## Candidate 2 — TagIndexService: Complete the interface to remove encapsulation breach

- **Files**: `electron/services/tag-index-service.ts:4` (private `tagToPath` field), `electron/ipc/handlers/tag-handlers.ts:14` (type-cast breach)
- **Problem**: `TagIndexService.tagToPath` is `private` but `handleTagGetIndex` accesses it via type-cast. The service has no public method for bulk tag→path iteration.
- **Solution**: Add a public method like `getAllEntries(): ReadonlyArray<{ tag: string; filePath: string }>`.
- **Benefits**: Encapsulation restored; handler testable through real interface; internal representation can change without breaking callers.

## Candidate 3 — Image Representation: Co-locate the dual-representation sync seam

- **Files**: `src/shared/markdown-image-placeholder.ts`, `use-project-editor-actions.ts`, `rich-markdown-editor-core.ts`, `rich-markdown-editor-serialization.ts`
- **Problem**: Base64 image ↔ placeholder swap logic is scattered across hooks, editor core, and serializer. The invariant "all save paths must hydrate before writing" has no locality.
- **Solution**: Create an `ImageDocumentAdapter` module with `prepareForEdit(documentId, markdown) → leanMarkdown` and `prepareForSave(documentId, leanMarkdown) → fullMarkdown`.
- **Benefits**: Single module owns the entire strip/hydrate cycle and image map cache; save/load/edit paths all cross the same seam.

## Candidate 4 — Close-Save Flow: Bring the back-channel onto the IPC contract

- **Files**: `electron/main-process/window-close.ts:6-9`, `use-project-editor-close-effect.ts:23-33`
- **Problem**: Main process calls `executeJavaScript('window.__tramaSaveAll()')` — a non-typed back-channel bypassing the IPC contract.
- **Solution**: Add a `renderer:save-all` IPC channel; remove the `__tramaSaveAll` global.
- **Benefits**: Close save becomes a first-class contract entry; testable through the IPC channel instead of a non-typed global.

## Candidate 5 — CorkboardOrder: Resolve the project-relative vs section-relative path split

- **Files**: `electron/services/index-service.ts`, sidebar drag-drop hooks
- **Problem**: Index stores project-relative `corkboardOrder` keys, but sidebar emits section-relative keys. Dual scoping can drop custom order during reconciliation.
- **Solution**: Normalize at the seam — either the sidebar emits project-relative paths, or the index module accepts a section resolver.
- **Benefits**: Unambiguous path coordinate system; no silent order loss during reconciliation.
