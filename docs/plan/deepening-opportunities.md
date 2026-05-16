Architectural Deepening Opportunities
Candidate 1 — Action hooks have no isolated tests
Files: use-project-editor-create-actions.ts, use-project-editor-file-actions.ts, use-project-editor-focus-actions.ts, use-project-editor-folder-actions.ts, use-project-editor-picker-actions.ts, use-project-editor-sidebar-actions.ts, use-project-editor-conflict-actions.ts (7 files, ~650 lines total)

Problem: Each action hook is a module with a small interface (2–5 callbacks), making them ideal for isolated unit testing. Yet zero have dedicated tests — all are exercised only through the 630-line use-project-editor.test.ts integration test. When a test fails, you can't pinpoint which module broke without stepping through the composition chain. The modules are individually deep enough for isolation, but no adapter (test) exists to prove it at the seam.

Solution: Each action hook already has a clean function-based interface. Add a unit test per hook that instantiates the hook's returned callbacks with stubbed dependencies (mock tramaApi, fake PaneWorkspace, stubbed setters). This requires no architectural change — the seams already exist.

Benefits:

Locality: A bug in editFileTags breaks only file-actions.test.ts, not the 630-line integration test.
Leverage: Each hook's interface (a few callbacks) is fully exercised. Regressions are isolated.
Tests: 7 new test files, each ~50 lines. The interface is already the test surface.
Deletion test: Delete one of these hooks and its complexity reappears in all callers of useProjectEditor. They earn their keep — they just aren't verified at their own seam.

Candidate 2 — Monolithic ProjectEditorActions interface (19+ methods)
Files: use-project-editor-ui-actions.ts, use-project-editor-ui-actions-helpers.ts, use-project-editor-ui-actions-helpers-core.ts, use-project-editor-actions.ts (4 files, ~500 lines)

Problem: useProjectEditorUiActions assembles ~19 callbacks from 9 domain-specific hooks into one flat ProjectEditorActions object. Every component and effect that needs one action receives the full interface of 19 methods. This is a shallow interface — the surface is large, but each method delegates immediately to a domain hook. The use-project-editor-ui-actions-helpers.ts and use-project-editor-ui-actions-helpers-core.ts files further split what is essentially one concern (UI action composition) across three files.

Solution: Split ProjectEditorActions into domain-grouped sub-interfaces matching the sub-state decomposition: DocumentActions, LayoutActions, SidebarActions, ProjectActions, ConflictActions. Components consume only the group they need. The composition hub (use-project-editor-actions.ts) still builds them all, but callers declare which subset they depend on.

Benefits:

Leverage: A toolbar component imports DocumentActions (3 methods) instead of ProjectEditorActions (19 methods).
Locality: Renaming toggleWorkspaceLayoutMode no longer ripples through every component's import path — only LayoutActions consumers.
Tests: Each domain action group can be tested independently with stubbed dependencies scoped to that domain.
Deletion test: Delete the flat ProjectEditorActions interface and replace with grouped interfaces. Callers become more explicit about what they need. Complexity concentrates in the composition hub — that's the correct locality.

Candidate 3 — tag-handlers.ts casts through private internals
Files: electron/ipc/handlers/tag-handlers.ts (43 lines), electron/services/tag-index-service.ts (96 lines)

Problem: Line 14 of tag-handlers.ts accesses the TagIndexService's private tagToPath Map through a type assertion:

(tagIndexService as unknown as { tagToPath: Map<string, string> }).tagToPath
This violates encapsulation. If TagIndexService changes its internal representation (e.g., to an inverted index or a trie), the handler breaks silently with no compiler error. The mapping from internal Map to the Record<string, string> response format is a service concern, not an IPC glue concern.

Solution: Add a public method to TagIndexService (e.g., getTagIndex(): Record<string, string>) that performs the Map-to-Record conversion internally. The handler calls it instead of reaching inside. The service owns its representation; the handler only sees the output.

Benefits:

Locality: The Map iteration logic lives in the service, next to the data structure it iterates. Change the internal structure, change the exporter in one place.
Leverage: The new getTagIndex() method is a deep operation (iterates and projects the full index). The handler's interface to the service shrinks from "know the internal type and cast" to "call one method."
Tests: TagIndexService can now be tested for its public output shape without handlers present.
Deletion test: Delete the as unknown as... cast. Complexity (the Map iteration) would reappear in the handler or be duplicated elsewhere. The fix concentrates it in the service.

Candidate 4 — folder-handlers.ts duplicates path-manipulation logic
Files: electron/ipc/handlers/project-handlers/folder-handlers.ts (120 lines), electron/services/document-repository.ts (191 lines), src/features/project-editor/use-project-editor-folder-actions.ts (165 lines)

Problem: Three path-manipulation helpers (withTrailingSlash, markdownFilesUnderFolder, remapFolderFilePath) live in folder-handlers.ts — an IPC handler file. Meanwhile, the frontend's use-project-editor-folder-actions.ts duplicates related path-scoping logic for the renderer side (dirty checking across folders, layout path remapping). The same concept — "what documents are affected by a folder operation" — appears in two places with no shared module. The handlers also use markInternalWrite to suppress chokidar events during folder renames, which is handler-level orchestration leaking watcher concerns.

Solution: Extract a shared folder-operations module (in src/shared/) that provides pure functions for folder-path remapping and affected-file calculation. Both the handler and the frontend action hook import it. The handler delegates path manipulation to the shared module and keeps only IPC glue. The frontend hook imports the same pure functions instead of re-deriving the logic.

Benefits:

Locality: The answer to "which files does renaming folder X affect?" lives in one function, tested once, consumed by two adapters (main process, renderer).
Leverage: The shared module's interface is small (3–4 pure functions). Both callers get significant behaviour (path normalization, suffix extraction, remapping) from that small surface.
Tests: A single pure-function test covers both callers. No need to duplicate path logic tests for handler and frontend.
Candidate 5 — project-folder-dialog-handler.ts mixes dialog UI with business logic
Files: electron/ipc/handlers/project-handlers/project-folder-dialog-handler.ts (104 lines), src/shared/project-sections.ts

Problem: This module does two things: (1) detects missing project folders and (2) opens native OS dialogs to ask the user if they want to create them. The detection logic (getMissingProjectFolders, ensureRequiredProjectFolders) is business logic; the dialog loop (promptForMissingFolders, showFolderDialog) is UI interaction. They're in the same file with the same call depth. Testing the detection logic requires mocking Electron's dialog API. The two concerns have different stability profiles — folder structure rules change rarely; dialog prompting patterns change with UX iteration.

Solution: Extract the pure detection logic (getMissingProjectFolders, ensureRequiredProjectFolders) into a service (or into src/shared/ since it's pure path checking against RELEVANT_SECTION_NAMES). Keep the dialog orchestration in the handler. Handler tests mock only the dialog; the detection logic is tested with pure data.

Benefits:

Locality: "What folders does a project need?" is a domain rule, tested independently of Electron. "How do we ask the user about missing folders?" is a UX concern, tested with dialog mocks.
Leverage: The detection functions become reusable (e.g., for a non-dialog recovery path, or for validating project structure on open without prompting).
Tests: Two test files replace one — pure logic test (no Electron) and handler test (dialog mocked).
~~Candidate 6 — Sidebar micro-components: many tiny files with 1:1 composition ratio~~ ✅ **IMPLEMENTED**

**What changed:**
- Settings consolidation: `sidebar-settings.tsx` now contains `SettingsField` (layout component) + all 5 control subcomponents + `SidebarSettingsContent`. Deleted 10 files (`theme-setting`, `spellcheck-setting`, `focus-scope-setting`, `panel-width-setting`, `sidebar-settings-content`, and 5 individual control files).
- Hook consolidation: `sidebar-explorer-hooks.ts` (4 tiny hooks) and `sidebar-dialog-hooks.ts` (2 dialog hooks). Deleted 6 individual hook files.
- Cleanup: `sidebar-tree-types.ts` (1-line re-export) inlined; import now points to `sidebar-tree-logic`.

**Net result:** 51 → 35 sidebar files. Lint passes; all tests pass.

**Key insight preserved:** `SettingsField` provides a small interface (`label`, `children`, `note?`) behind which all settings layout behavior lives. Controls no longer need to know whether they have their own label wrapper — the layout component owns that concern. This is the same "layout component" pattern used successfully in `sidebar-explorer-body.tsx`.




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
