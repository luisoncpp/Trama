useProjectEditor being called every keystroke

> If you want to fix the keystroke churn, the next deepening candidate is PaneWorkspace itself.

> PaneWorkspace is currently a useMemo over mutable pane bindings. To make it stable, you'd need to:

> Store PaneWorkspace in a useRef (so its identity survives renders).
> Mutate its internal layout/pane state in place inside effects or callbacks, rather than recreating it.
> Or, adopt the pull-based snapshot model from ADR-0001 (discarded) — make PaneWorkspace subscribe to changes and expose getSnapshot().

2. Rich editor focus-mode cluster
Files rich-markdown-editor-focus-scope.ts, rich-markdown-editor-focus-scope-helpers.ts, rich-markdown-editor-focus-scope-geometry.ts, rich-markdown-editor-focus-scope-scroll.ts

Problem Understanding “how focus mode renders” requires reading four files plus CSS. geometry.ts has pure text-boundary functions, but the real bugs (scroll jumping after padding changes, stale selection rects, CSS Highlights API fallback coordination, inactive-pane dimming) live in focus-scope.ts, which wires helpers together via useEffect and requestAnimationFrame. The seam between the files is artificial: the geometry helpers have no stable contract independent of how focus-scope.ts calls them, and the scroll module is tightly coupled to the classList manipulations in the helpers.

Solution Merge into one or two modules. Keep the pure geometry functions as internal helpers, but stop pretending they form an independent module. Colocate the scroll logic with the effect that schedules it.

Benefits

Locality: Change, bugs, and knowledge about focus-mode rendering concentrate in one place.
Leverage: Callers (the editor component) deal with one focus-mode interface instead of four.
Tests: The current integration tests already exercise the whole cluster; deepening aligns the module boundary with the test surface.

4. Book export PDF barrel and font-utils indirection
Files book-export-pdf-renderer.ts (2-line re-export barrel), book-export-pdf-font-utils.ts (37 lines, only called from book-export-pdf-utils.ts and book-export-pdf-inline.ts)

Problem book-export-pdf-renderer.ts is a pure barrel with zero logic; its only purpose is a name, but the architecture doc already points to book-export-pdf-utils.ts as canonical. book-export-pdf-font-utils.ts contains normalizeForFont and safeTextForFont, which are only called from two files. Its entire interface is its entire implementation. The deletion test fails: deleting the barrel changes nothing but import paths, and deleting font-utils would just move two small functions into their only callers.

Solution Remove the barrel. Inline book-export-pdf-font-utils.ts into book-export-pdf-utils.ts or book-export-pdf-inline.ts (the only callers).

Benefits

Locality: PDF rendering knowledge lives in the modules that actually render PDFs.
Leverage: Fewer files to traverse when debugging font issues in export.
Tests: No behavioral change; the existing tests already exercise the inlined functions.
5. Markdown layout directive duplication across renderer and export seams
Files src/shared/markdown-layout-directives.ts, src/shared/markdown-layout-directives-artifact-node.ts, electron/services/book-export-directives.ts

Problem The shared module owns parsing and serialization of trama:center, trama:spacer, and trama:pagebreak for the editor. But book-export-directives.ts reimplements the exact same regex patterns and HTML artifact parsing for book export. Both files know how to parse <!-- trama:spacer lines=N --> and map center:start/center:end boundaries. If a new directive is added, three files must change. This is a leaky seam: the export layer should not reimplement what the shared layer already knows.

Solution Move the directive AST/parsing into src/shared/markdown-layout-directives.ts and have book-export-directives.ts become a thin format-specific serializer, or disappear entirely. The shared module already has the canonical regexes; the export layer should consume them.

Benefits

Locality: Directive parsing knowledge lives in one shared module.
Leverage: Adding a new directive requires changing one interface, not three implementations.
Tests: The shared parser tests become the single source of truth; export tests only need to verify format-specific output.
6. Pane save logic and snapshot-logger pass-throughs
Files src/features/project-editor/pane/pane-save-logic.ts, src/features/project-editor/pane/snapshot-compare-logger.ts

Problem executePaneSave checks if (!paneDocument.isDirty || !paneDocument.path) return, then calls saveDocumentNow. But PaneWorkspace.savePaneIfDirty already performs the exact same guard before calling executePaneSave. The file exists to be “testable,” yet its only test is indirect through PaneWorkspace tests. The snapshot logger is a debug-only utility with a 5-parameter interface and trivial implementation.

Solution Inline executePaneSave into PaneWorkspace.savePaneIfDirty. Absorb the logger as a private helper inside PaneWorkspace or inline it.

Benefits

Locality: The save-or-skip decision lives in the module that owns pane state.
Leverage: Callers still interact with PaneWorkspace; nothing leaks across the seam.
Tests: PaneWorkspace tests already cover this behavior; removing the pass-through makes those tests hit the real module.
Which of these would you like to explore?



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

~~Candidate 3 — Sidebar drag-and-drop DOM leakage~~ ✅ **IMPLEMENTED**

**What changed:**
- Extracted `sidebar-drop-logic/` deep module with `index.ts` public facade and `private/` implementation helpers.
- `calculateDropPosition()` is now pure: accepts `RowGeometry[]` instead of querying `containerRef` DOM on every `dragOver`.
- `SidebarTreeRows` builds `RowGeometry[]` once at `dragStart` via `buildRowGeometries()`; no per-drag-over measurement overhead.
- Container handlers detect background drops via `e.target !== e.currentTarget` instead of `closest('[data-sidebar-row-index]')`.
- `executeDrop()`, `handleFileCrossFolderDrop()`, `handleFileSameFolderReorder()` moved behind the new module seam.
- Deleted `use-sidebar-tree-drag-handlers.ts` and `sidebar-file-drop-logic.ts`.

**Net result:** Drag-and-drop math is fully pure and testable without DOM mocks. The seam between DOM ownership (tree component) and position math (deep module) is clean. Lint passes; all tests pass.




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
