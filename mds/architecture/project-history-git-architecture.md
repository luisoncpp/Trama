# Project History with Local Git Architecture

## Purpose

This subsystem adds local Git-backed history for Trama-managed content without turning the renderer into a Git client. The Electron main process owns Git discovery, staging, commit creation, history queries, preview hydration, and historical restore writes.

## Entry points

- Shared contracts: `src/shared/ipc-git-history.ts`, `src/shared/ipc.ts`, `src/shared/ipc-channels.ts`
- Renderer state/actions: `src/features/project-editor/project-editor-revision-types.ts`, `src/features/project-editor/project-editor-git-history-state.ts`, `src/features/project-editor/git-history-actions.ts`, `src/features/project-editor/git-history-helpers.ts`
- Renderer shell/UI: `src/features/project-editor/use-project-editor-effects.ts`, `src/features/project-editor/use-project-editor-context-menu-effect.ts`, `src/features/project-editor/components/sidebar/sidebar-transfer-content.tsx`, `src/features/project-editor/pane/pane-editor.tsx`, `src/features/project-editor/pane/editor-panel.tsx`, `src/features/project-editor/pane/revisions/revisions-rail.tsx`
- Pane coordination: `src/features/project-editor/pane/pane-workspace.ts`, `src/features/project-editor/pane/pane-workspace-revision-state.ts`
- Preview-aware editor controls: `src/features/project-editor/pane/rich-markdown-editor/rich-markdown-editor.tsx`, `src/features/project-editor/pane/rich-markdown-editor/rich-markdown-editor-core.ts`, `src/features/project-editor/pane/rich-markdown-editor/rich-markdown-editor-commands.ts`, `src/features/project-editor/pane/rich-markdown-editor/rich-markdown-editor-find.tsx`, `src/features/project-editor/pane/rich-markdown-editor/rich-markdown-editor-find-overlay.tsx`, `src/features/project-editor/pane/rich-markdown-editor/toolbar-private/rich-markdown-editor-toolbar-controller.ts`
- IPC registration: `electron/ipc.ts`
- IPC handlers: `electron/ipc/handlers/git-history-handlers.ts`
- Git orchestration: `electron/services/git-history-service.ts`
- Repo/path helpers: `electron/services/git-history-repository.ts`
- Historical restore writes: `electron/services/git-history-restore-service.ts`
- Native context-menu bridge: `src/shared/workspace-context-menu.ts`, `electron/main-process/context-menu.ts`

## Managed content invariant

Only Trama-managed content participates in snapshots and revision restore logic:

- `book/`
- `outline/`
- `lore/`
- `res/`
- root `.trama.index.json`

`src/shared/project-sections.ts` is the single source of truth for this boundary.

## Repository discovery model

`git-history-repository.ts` detects three states:

1. Git CLI unavailable
2. Project already inside a repository
3. No repository yet, so initialization at the project root is possible after explicit renderer confirmation

When the project lives inside a parent repository, the service uses that repository and scopes every Git path to the opened project folder via a repository-relative `projectPrefix`.

## Save Snapshot flow

1. Renderer flushes/saves dirty panes before calling IPC.
2. `handleSaveGitSnapshot()` validates payload and delegates to `GitHistoryService.saveSnapshot()`.
3. The service discovers the repository or returns `init-required` when the renderer has not yet confirmed initialization.
4. The service blocks merge/rebase/cherry-pick/bisect states by checking Git control files in the resolved `.git` directory.
5. The service rejects the snapshot when unrelated files are already staged.
6. The service collects managed changed paths under the project scope only:
   - tracked modified/deleted
   - already staged managed paths
   - untracked managed paths not ignored by Git
7. The service stages only those changed managed paths with normal `.gitignore` behavior.
8. If nothing ends up staged, it returns a friendly `noop` result.
9. The service commits with fixed local-time message `Trama snapshot: YYYY-MM-DD HH:mm`.

### Renderer snapshot entry

1. Sidebar Transfer section shows `Save Snapshot` only when `gitHistory.gitAvailable` is true.
2. `buildGitHistoryActions().saveSnapshot()` forces dirty-pane save before IPC so the snapshot reflects visible editor content, not stale debounced state.
3. If the backend reports `needsInitialization`, the renderer asks for explicit confirmation before initializing Git in the project root.
4. Success/failure feedback goes through the existing `statusMessage` seam instead of a new toast subsystem.
5. After a successful snapshot, every open revisions rail refreshes and re-selects `Current`.

### Important staging rule

Do not call `git add` with broad managed roots when some of those roots do not exist inside the repository scope. Git fails pathspec resolution on missing directories. Stage the exact changed managed paths instead.

## Revision listing flow

1. `handleListDocumentRevisions()` validates `{ path, cursor }`.
2. Non-repository projects return `gitAvailable`/`repositoryRoot` metadata plus empty revisions.
3. Tracked documents use `git log --follow --date-order --diff-filter=AMCR`.
4. Pagination is fixed to first page 100, with `cursor` as the next `--skip` offset.
5. The parser walks rename entries backward so each row reports the document path as it existed in that commit.
6. Deletion commits are excluded by `--diff-filter=AMCR`.

### Renderer rail flow

1. `toggleDocumentRevisions(path, pane)` resolves an explicit pane target; split-mode commands must never depend on later global active-pane changes.
2. Before opening the rail, the renderer flushes the pane serialization ref without saving so the `Current` row reflects what the user sees right now.
3. The rail state lives on each `PaneDocumentState.revisionRail`, so rail open/selection/preview state is pane-local and session-only.
4. `refreshRevisionRail()` populates revisions, pagination cursor, and `latestRevisionValue`, then updates the `Current` label to either `Current` or `Current changes`.
5. The native context menu can dispatch `{ type: 'see-revisions', pane, path }` through `WORKSPACE_CONTEXT_MENU_EVENT`, and the renderer opens the targeted rail without re-inferring pane identity.

## Revision preview flow

1. `handleReadDocumentRevision()` reads the raw markdown blob with `git show`.
2. The service hydrates `res/*.png` links into embedded PNG data URLs for the renderer preview.
3. Image resolution prefers commit blobs first.
4. If a referenced image blob is missing in the commit, preview falls back to the current working tree only.
5. If the image is also missing in the working tree, preview emits the normal broken-image placeholder comment.

### Renderer preview mode

1. Selecting a revision loads preview markdown through `readDocumentRevision` and stores it in `revisionRail.previewValue`.
2. Preview is an explicit read-only mode (`previewReadOnly`) rather than a generic disabled editor state.
3. `previewVersion` forces one external re-apply into Quill even when text equality alone would otherwise suppress sync.
4. While preview is active, the toolbar disables save/revert, Find suppresses replace UI, `paste-markdown` is blocked, and the native context menu hides cut/paste entries.
5. The preview action should live in the existing right-side toolbar slot as a compact `Restore revision` button; this avoids per-row action clutter while keeping the destructive action anchored next to the read-only preview state.
6. Pane switches, file selection, and pane-history navigation all exit preview mode before loading the next working document state.

## Load revision flow

1. `handleLoadDocumentRevision()` validates payload and blocks special Git states.
2. The service reads exact markdown bytes from Git and writes them directly to the current document path.
3. It restores only referenced historical `res/*.png` files that exist in the selected commit.
4. It marks markdown and restored images as internal writes so file watching does not treat them as external edits.
5. It updates only the restored document cache entry in `.trama.index.json` via `IndexService.updateCache()`.
6. It preserves unrelated files and existing unreferenced images.

### Renderer load-confirmation flow

1. The rail only shows `Load this revision` for the selected revision row.
2. Clicking it opens an in-rail confirmation state (`confirmation.open`) owned by the pane-local rail model.
3. Confirming the load calls `loadDocumentRevision`, then reloads the current document through the normal renderer document-open path.
4. After reload, the rail refreshes and returns to `Current` so the pane is back on editable working-tree state.
5. Closing the rail or navigating to another document must fully clear the pane-local rail target (`documentPath`, selection, preview state) so reopening revisions always retargets to the current file.

## Cache/index invariants

- Restore does **not** call the normal document save/materialize pipeline.
- Restore does **not** full-reconcile the index.
- Restore updates only the target document cache entry so frontmatter metadata matches the restored markdown.
- `corkboardOrder` remains untouched.

## Renderer invariants

- Revisions rail state is pane-local, not global.
- Rail state is session-only; it is not persisted in workspace layout storage.
- `Current` must reflect flushed editor content before revision queries, even if autosave/debounce has not fired.
- Preview mode must be read-only without pretending the document is unloaded/disabled.
- Context-menu revision commands must carry explicit `{ pane, path }` payloads in split mode.

## Focused debug playbook

1. Run `npm run test -- tests/git-history-service.test.ts`.
2. Run `npm run test -- tests/ipc-contract.test.ts`.
3. Run `npm run test -- tests/use-project-editor.test.ts tests/sidebar-panels.test.ts tests/rich-markdown-editor.test.ts`.
4. Run `npm run build`.
5. Run `npm run lint` and check max-lines regressions first in:
   - `src/features/project-editor/git-history-actions.ts`
   - `src/features/project-editor/pane/pane-workspace.ts`
   - `src/features/project-editor/pane/revisions/revisions-rail.tsx`
   - `electron/main-process/context-menu.ts`
6. If snapshot staging is wrong, inspect:
    - `electron/services/git-history-service.ts`
    - `electron/services/git-history-repository.ts`
    - `src/shared/project-sections.ts`
7. If the rail opens in the wrong pane or wrong file, inspect:
   - `src/shared/workspace-context-menu.ts`
   - `electron/main-process/context-menu.ts`
   - `src/features/project-editor/use-project-editor-context-menu-effect.ts`
8. If preview still allows mutation affordances, inspect:
   - `src/features/project-editor/pane/rich-markdown-editor/rich-markdown-editor-commands.ts`
   - `src/features/project-editor/pane/rich-markdown-editor/rich-markdown-editor-find.tsx`
   - `src/features/project-editor/pane/rich-markdown-editor/toolbar-private/rich-markdown-editor-toolbar-controller.ts`
9. If revision paths are wrong across rename history, inspect `parseRevisionLog()` in `git-history-service.ts`.
10. If restore mutates images unexpectedly, inspect `restoreHistoricalImages()` in `git-history-restore-service.ts`.

## Related docs

- Spec: `mds/spec/project-history-git-spec.md`
- Plan: `mds/plan/project-history-git-implementation-plan.md`
- ADR: `mds/adr/0001-restore-revision-images-for-fidelity.md`
- Lesson: `mds/lessons-learned/revision-preview-should-use-explicit-read-only-mode.md`
