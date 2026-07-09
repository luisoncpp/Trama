# Global Search Result to Local Find Flow

## Trigger

The user clicks a file row in the sidebar Search results list.

## Entry point

`src/features/project-editor/components/sidebar/sidebar-panel/private/sidebar-search-content.tsx` renders result buttons that call `useGlobalSearchController().openResult(path)`.

## Sequence

1. `useGlobalSearchController.runSearch()` stores the last completed `query` and `TextSearchOptions` in its `executed` snapshot.
2. `openResult(path)` posts `{ path, query, options }` through `postGlobalFindRequest()` and then calls `selectFile(path)`.
3. `global-find-request-mailbox.ts` keeps a single pending request. `consumeGlobalFindRequest(documentPath)` returns it only when `documentPath` equals the requested path.
4. `sidebar-file-actions/private/file-select.ts` prepares the active pane for exit, assigns the clicked path to the active pane layout, and starts `loadDocument(path, pane)`.
5. While the file is loading, the active pane can render with the new `documentId` but old or empty `editorValue`. This is expected because layout path updates before disk content arrives.
6. `useGlobalFindPresetEffect()` runs inside the rich editor find controller once the editor `documentId` matches the pending request. It opens the local find bar and applies the requested query/options.
7. The first query scan may happen before target content has fully applied to Quill or before the query state has committed. `useContentMutatedRefreshEffect()` therefore refreshes matches on content-session changes, document changes, query/options changes, and editor enablement changes.
8. `EditorContentLoop.applyExternalValue()` notifies content mutation after applying disk content. The find controller recomputes matches against the current Quill text.
9. `useActiveMatchOverlayEffect()` selects and reveals the active match. After reveal it forces one fresh bounds render so an early `getBounds()` miss or stale layout read does not leave the `.editor-find-highlight` absent.
10. A short settle timer reasserts reveal after late layout shifts.

## Reads

| Source | File | Purpose |
|---|---|---|
| Last executed search | `global-search-controller.ts` | Query/options to transfer into local find |
| Pending request | `global-find-request-mailbox.ts` | One-shot bridge between sidebar search and matching editor document |
| Active pane layout path | `sidebar-file-actions/private/file-select.ts` | Determines which document id the editor receives immediately |
| Quill text and Delta ops | `editor-session-find-state.ts`, `editor-session-tag-math.ts` | Finds plain-text matches and maps them to Quill indexes |
| Quill bounds | `editor-session-find-visual.ts` | Positions the active match overlay |

## Writes

| Target | File | What changes |
|---|---|---|
| Pending request | `global-find-request-mailbox.ts` | Replaced on result click, consumed by matching document |
| Pane layout/document state | `file-select.ts`, `pane-workspace.ts` | Active pane path changes first; loaded content follows async |
| Find state | `editor-session-find-state.ts` | Query/options, matches, and active match index |
| Quill selection | `editor-session-find-state.ts`, `editor-session-find-visual.ts` | Active match range is selected with Quill indexes |
| Overlay render tick | `editor-session-find.tsx` | Forces fresh active bounds after reveal and scroll |

## Invariants

- A global find request must only be consumed by the editor whose `documentId` matches the requested path.
- Applying a preset query is not enough; matches must be refreshed after the query/options commit and after target content applies.
- Active match bounds are layout-dependent. Recompute after reveal as well as on scroll.
- Plain-text match offsets must be converted to Quill document indexes before `setSelection()` or `getBounds()`.

## Common Failure Modes

| Symptom | Likely cause | First check |
|---|---|---|
| Find bar opens but no match appears selected after result click | Preset scanned old/empty editor content and never refreshed after query commit | `useContentMutatedRefreshEffect()` dependencies |
| Counter shows matches but highlight is absent | First bounds read happened before layout was ready and no follow-up render occurred | `useActiveMatchOverlayEffect()` bounds refresh |
| Highlight drifts during scroll | Scroll listener is not attached to the current `.ql-container` | `useFindLifecycle()` scroll effect |
| Match range is shifted around layout directives/images | Plain text offset was passed directly to Quill | `mapPlainTextIndexToQuillIndex()` |

## Focused Tests

```bash
npm run test -- tests/global-find-preset-selection.test.ts
npm run test -- tests/rich-markdown-editor-find-regression.test.ts
```
