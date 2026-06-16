# Rich Editor Session Deepening Plan

Date: 2026-06-15
Status: Implemented
Scope: Deepen the rich markdown editor into one `Editor session` module with a typed caller seam
Related: `CONTEXT.md`, `mds/architecture/rich-markdown-editor-core-architecture.md`, `mds/architecture/rich-editor-hotspots.md`, `mds/architecture/editor-serialization-debounce-architecture.md`, `mds/architecture/image-handling-architecture.md`, `mds/plan/done/rich-editor-refactor-plan.md`

## 1. Problem Statement

The 2026-04 rich editor refactor extracted serialization, external sync, and canonical value comparison into focused files under `pane/rich-markdown-editor/`. That improved **locality** inside each hotspot, but the **seam** callers cross is still implicit:

- Seven refs and a mutable `serializationRef` are wired across hooks in `rich-markdown-editor.tsx` and `rich-markdown-editor-core.ts`.
- `PaneWorkspace` reaches the editor through `serializationRefs.primary.current.flush()` — a convention documented in architecture docs, not enforced by types.
- Layout-center logic is split across six files invoked from the serialization `text-change` path.
- Find, focus scope, tag overlay, and zoom are separate hooks that read shared refs, including `serializationRef.tagOverlayRecalcRef`.

**Deletion test:** removing `rich-markdown-editor-core.ts` does not remove complexity — it reappears across four hook call sites. The module is a shallow orchestrator whose interface is nearly as complex as its implementation.

Integration regressions (wrong pane flushed, images blink, stale tag underlines) land at wiring, not in the well-tested pure helpers. See `mds/architecture/rich-editor-hotspots.md`.

## 2. Design Decisions (locked)

| Fork | Choice | Rationale |
|------|--------|-----------|
| Scope | **A2 — full editing surface** | One deep module owns lifecycle plus find, focus, tag overlay, zoom, and toolbar wiring |
| Caller seam | **B2 — typed session API** | `PaneWorkspace` calls `editorSession.flush()`; no `serializationRef.current.flush = …` mutation |
| Increment | **Two slices** with verification gates between them | Preserve behavior slice-by-slice; catch regressions before absorbing overlays |
| Layout-center | **C2 — `LayoutDirectiveController`** | Fold six `layout-*` files into one module behind the session |

## 3. Goals

1. Introduce an **Editor session** module — one interface for the full rich editing surface per pane.
2. Preserve all current caller-visible behavior during both slices unless a bug fix is required.
3. Make the session interface the primary test surface for lifecycle integration (debounce, external sync, flush).
4. Replace ref-mutation conventions with typed methods (`flush()`, `subscribeContentMutated()`, etc.).
5. Keep split-pane contracts intact: explicit pane identity, per-pane sessions, closure-captured `editor` + `documentId` at handler registration.
6. Stay lint-compliant via `editor-session-private/` decomposition (`max-lines`, `max-lines-per-function`).

## 4. Non-goals

1. Do not change debounce timing (1 s) or flush-before-save/switch/revert product semantics.
2. Do not change image placeholder / hydration strategy (`mds/architecture/image-handling-architecture.md`).
3. Do not redesign Quill blot formats or turndown rules.
4. Do not change pane-exit policy (save vs block) — that is a separate deepening track.
5. Do not rewrite `PaneWorkspace` beyond replacing `serializationRefs` with `editorSessionRefs`.

## 5. Current Behavior To Preserve

| Flow | Current owner | Preserve |
|------|---------------|----------|
| User types | `registerEditorTextChangeHandler` | Immediate dirty mark + layout sync + 1 s debounced flush |
| `flush()` | `serializationRef.current.flush` (mutated at registration) | Returns placeholder markdown; hydrates for parent `onChange` |
| Save / switch / revert | `PaneWorkspace.flushPaneContent` → ref flush | Caller uses flush return value directly |
| External reload | `useSyncExternalValue` | Canonical comparison; `forceApplyVersion` force-apply |
| `documentId` change cleanup | Serialization handler cleanup | Cancel timer only; **never** flush on cleanup |
| Center layout toggle | `layout-*` modules | Same DOM artifacts and keyboard bindings |
| Find / replace | `rich-markdown-editor-find*` | Ctrl+F / Ctrl+H behavior unchanged |
| Focus mode | `rich-markdown-editor-focus-scope*` | Highlights API + fallback overlay |
| Wiki tag overlay | `rich-markdown-editor-tag-overlay*` | Recalc on content mutation; Ctrl/Cmd click navigate |
| Zoom | `use-editor-zoom.ts` | Shared zoom across twin panes |
| Split panes | Two `serializationRefs` | Two independent sessions; no cross-pane ref reads at flush time |

## 6. Target Structure (end of slice 2)

```
src/features/project-editor/pane/rich-markdown-editor/
  editor-session/
    editor-session.ts                    # public interface + useEditorSession hook
    editor-session-private/
      editor-session-lifecycle.ts        # Quill init, dispose, disabled, spellcheck
      editor-session-serialization.ts    # debounce + flush
      editor-session-external-sync.ts    # canonical apply + forceApplyVersion
      layout-directive-controller.ts     # C2: absorbs layout-* files
      editor-session-focus.ts
      editor-session-find.ts
      editor-session-tag-overlay.ts
      editor-session-zoom.ts
      editor-session-toolbar.ts          # or toolbar as session subscriber
  rich-markdown-editor.tsx               # thin: props → session → view
  rich-markdown-editor-view.tsx          # render shell (may accept session handle)
  rich-markdown-editor-quill.ts          # Quill adapter (unchanged role)
  rich-markdown-editor-value-sync.ts     # pure helpers (unchanged)
```

### 6.1 Public interface

```ts
interface EditorSession {
  flush(): string | null
  getEditor(): Quill | null
  getCanonicalValue(): string
  subscribeContentMutated(cb: () => void): () => void
  dispose(): void
}
```

Slice 2 may extend the interface with read-only render state accessors for the view (find bar, tag matches, focus scope) if that keeps `rich-markdown-editor-view.tsx` declarative.

### 6.2 Pane-layer seam (B2)

| Before | After |
|--------|-------|
| `ProjectEditorModel.serializationRefs` | `ProjectEditorModel.editorSessionRefs` |
| `createEditorSerializationRefs()` | `useRef<EditorSession \| null>(null)` per pane |
| `PaneWorkspace.flushPaneContent` → `serializationRefs[pane].current.flush()` | → `editorSessionRefs[pane].current?.flush() ?? null` |
| `RichMarkdownEditor` assigns `editorSerializationRef.current = …` | `onSessionReady(session)` on mount; `onSessionReady(null)` on dispose |

## 7. Slice 1 — Foundation: `LayoutDirectiveController` + `EditorSession` core + B2 pane seam

**Goal:** Deepen lifecycle and layout. Pane callers cross the typed seam. Find / focus / tags / zoom stay as existing hooks temporarily.

### 7.1 Steps

#### 7.1.1 `LayoutDirectiveController` (C2)

Create `editor-session-private/layout-directive-controller.ts`. Absorb:

| Absorbed file | Responsibility |
|---------------|----------------|
| `rich-markdown-editor-layout-centering.ts` | `syncCenteredLayoutArtifacts` |
| `rich-markdown-editor-layout-center-ranges.ts` | range math |
| `rich-markdown-editor-layout-center-delete.ts` | delete boundaries |
| `rich-markdown-editor-layout-actions.ts` | toggle center |
| `rich-markdown-editor-layout-keyboard.ts` | keyboard bindings |
| `rich-markdown-editor-layout-blots.ts` | Quill blot registration |
| `rich-markdown-editor-layout-clipboard.ts` | paste matchers (if only used by layout) |

Update imports in `rich-markdown-editor-quill.ts` and tests. Delete absorbed files once tests pass. No behavior change.

#### 7.1.2 `EditorSession` class (lifecycle only)

Move logic from:

- `rich-markdown-editor-serialization.ts` → `editor-session-serialization.ts`
- `rich-markdown-editor-external-sync.ts` → `editor-session-external-sync.ts`
- `rich-markdown-editor-core.ts` → `editor-session-lifecycle.ts`

`EditorSession` owns: Quill init, debounce, external apply, `flush()`, canonical value tracking, `isApplyingExternalValue` guard.

`LayoutDirectiveController.syncOnTextChange(editor)` replaces the direct `syncCenteredLayoutArtifacts` call in the text-change path.

#### 7.1.3 `useEditorSession()` hook

- Stable session instance per mount / `documentId`.
- Exposes `session` to `RichMarkdownEditor` children.
- Calls `onSessionReady(session)` / `onSessionReady(null)` for pane registration.

Init effect dependencies: **`documentId` only** for Quill creation. Runtime toggles (disabled, spellcheck, read-only preview) in separate effects. See `mds/lessons-learned/rich-editor-effect-deps-remount.md`.

#### 7.1.4 B2 pane seam migration

Files expected to change:

- `src/features/project-editor/project-editor-types.ts` — add `EditorSession` type; add `editorSessionRefs` to `ProjectEditorModel`
- `src/features/project-editor/use-project-editor.ts` — hold per-pane session refs
- `src/features/project-editor/pane/pane-workspace.ts` — flush via session refs
- `src/features/project-editor/pane/pane-workspace-private/pane-workspace-bindings.ts` — rename `PaneSerializationRefs` → `PaneEditorSessionRefs` (or equivalent)
- `src/features/project-editor/pane/use-pane-workspace.ts`
- `src/features/project-editor/pane/pane-editor.tsx`
- `src/features/project-editor/pane/editor-panel.tsx` — pass `onSessionReady` instead of `editorSerializationRef`
- `src/features/project-editor/pane/rich-markdown-editor/rich-markdown-editor.tsx`

**Temporary compatibility bridge (slice 1 only):** keep optional `editorSerializationRef` prop whose `flush` delegates to `session.flush()`, so `editor-panel` wiring can migrate incrementally. **Remove in slice 2.**

#### 7.1.5 Orthogonal hooks (unchanged ownership, new editor source)

Find, focus, tags, zoom remain separate hooks in `rich-markdown-editor.tsx` but read `session.getEditor()` instead of a local `editorRef`.

Tag overlay continues using `serializationRef.tagOverlayRecalcRef` until slice 2 replaces it with `session.subscribeContentMutated()`.

### 7.2 Slice 1 verification gate

Do not start slice 2 until this gate passes.

#### Automated

```bash
npm run lint

npm run test -- tests/rich-markdown-editor-value-sync.test.ts
npm run test -- tests/rich-markdown-editor-center-toggle.test.ts
npm run test -- tests/rich-markdown-editor-center-delete-boundary.test.ts
npm run test -- tests/project-editor-debounce-regression.test.ts
npm run test -- tests/revert-changes-action.test.ts
npm run test -- tests/use-pane-workspace.test.ts
npm run test -- tests/rich-markdown-editor.test.ts
```

Update `tests/revert-changes-action.test.ts` and `tests/use-pane-workspace.test.ts` to use `editorSessionRefs` mocks instead of `serializationRefs` when those types migrate.

#### Manual (`npm run dev`)

| # | Action | Pass if |
|---|--------|---------|
| 1 | Open doc, type fast, wait 1 s | Content persists in pane state |
| 2 | Type, immediately save (toolbar or shortcut) | Save includes last keystrokes |
| 3 | Type, immediately switch file via sidebar | Outgoing pane saved |
| 4 | Document with images: type near image | No blink or vanish |
| 5 | Toggle center layout | Centered blocks render correctly |
| 6 | Split mode: type in both panes, switch active pane | Each pane saves independently |

## 8. Slice 2 — A2 completion: absorb overlays + thin shell + cleanup

**Goal:** One module owns the full editing surface. Remove ref-mutation and orphaned modules.

### 8.1 Steps

#### 8.1.1 Absorb into `EditorSession`

| Current module | Target |
|----------------|--------|
| `rich-markdown-editor-focus-scope*.ts` (4 files) | `editor-session-focus.ts` |
| `rich-markdown-editor-find*.ts` (4 files) | `editor-session-find.ts` |
| `rich-markdown-editor-tag-overlay.ts`, `overlay.ts`, `tag-helpers.ts`, `tag-highlights.tsx` | `editor-session-tag-overlay.ts` |
| `use-editor-zoom.ts` | `editor-session-zoom.ts` |
| `rich-markdown-editor-toolbar.ts` + `toolbar-private/*` | `editor-session-toolbar.ts` |

Tag overlay uses `session.subscribeContentMutated()` instead of `tagOverlayRecalcRef` on the serialization ref.

#### 8.1.2 Thin `rich-markdown-editor.tsx`

Target shape:

```tsx
export function RichMarkdownEditor(props: RichMarkdownEditorProps) {
  const session = useEditorSession(props)
  return <RichMarkdownEditorView session={session} />
}
```

#### 8.1.3 Remove dead modules and types

Delete after tests green:

- `rich-markdown-editor-core.ts`
- `rich-markdown-editor-serialization.ts`
- `rich-markdown-editor-external-sync.ts`
- `rich-markdown-editor-overlay.ts`
- Slice 1 compatibility `editorSerializationRef` prop
- `EditorSerializationRefs` interface
- `createEditorSerializationRefs()` in `use-project-editor-model.ts`

#### 8.1.4 New session-level tests

Add `tests/editor-session.test.ts`:

- init → simulate text-change → debounce flush → canonical value updated
- external value apply with `forceApplyVersion`
- flush return value is placeholder markdown (caller contract)
- `documentId` change cleanup cancels timer and does **not** flush
- closure capture: handler registered for pane A does not read pane B editor at fire time

#### 8.1.5 Documentation updates (same task as slice 2)

Per `mds/update.md`:

| File | Update |
|------|--------|
| `CONTEXT.md` | Add **Editor session** term (see §9) |
| `mds/architecture/rich-markdown-editor-core-architecture.md` | Diagram shows `EditorSession` as orchestrator |
| `mds/architecture/rich-editor-hotspots.md` | File paths point to `editor-session/` |
| `mds/live/file-map.md` | Register new files; remove deleted paths |
| `mds/plan/done/rich-editor-session-deepening-plan.md` | Mark implemented; move to `mds/plan/done/` |

### 8.2 Slice 2 verification gate

#### Automated

```bash
npm run lint
npm run test -- tests/editor-session.test.ts
npm run test -- tests/rich-markdown-editor.test.ts
npm run test -- tests/rich-markdown-editor-tag-overlay.test.ts
npm run test -- tests/rich-markdown-editor-tag-overlay-recalc.test.ts
npm run test -- tests/rich-markdown-editor-tag-overlay-stale-positions.test.ts
npm run test -- tests/rich-markdown-editor-find-regression.test.ts
npm run test -- tests/rich-markdown-editor-focus-rendering.test.ts
npm run test -- tests/rich-markdown-editor-focus-split-pane.test.ts
npm run test -- tests/rich-markdown-editor-toolbar-zoom.test.ts
npm run test -- tests/project-editor-debounce-regression.test.ts
npm run test -- tests/revert-changes-action.test.ts
npm run build
```

#### Manual (`npm run dev`)

| # | Action | Pass if |
|---|--------|---------|
| 1 | All slice 1 manual checks (§7.2) | Still pass |
| 2 | Ctrl+F find, Ctrl+H replace | Works; no cursor jump |
| 3 | Focus mode (line / sentence / paragraph) | Scope dimming correct |
| 4 | Wiki tag underlines + Ctrl/Cmd click | Underlines track typing; navigation opens file |
| 5 | Ctrl++ / Ctrl+- zoom | Both panes share zoom level |
| 6 | Revert with pending debounce | Flush-before-reload includes latest keystroke |
| 7 | Revision preview (read-only) | Editor disabled; restore works |

## 9. CONTEXT.md addition (slice 2)

Add to `CONTEXT.md` under Language:

**Editor session**:
The per-pane rich editor module that owns Quill lifecycle, debounced serialization, external value sync, and editing-surface features (find, focus scope, wiki tag overlay, zoom). Callers cross the seam via typed methods such as `flush()`, not ref mutation.
_Avoid_: Serialization ref, editor refs bag

## 10. Risks and mitigations

| Risk | Mitigation |
|------|------------|
| Quill remount from unstable effect deps | Init effect deps = `documentId` only; runtime toggles in dedicated effects |
| `max-lines` violations | `editor-session-private/` from slice 1 day one |
| Wrong pane flushed in split mode | Session captures `editor` + `documentId` in closure at registration — same invariant as today |
| Half-migrated API after slice 1 | Explicit removal list in §8.1.3; bridge prop documented as temporary |
| Tag overlay stale positions | Keep existing overlay tests; wire recalc through `subscribeContentMutated` before deleting refs |
| Test mocks still use `serializationRefs` | Update pane-workspace and revert tests in slice 1 when types migrate |

## 11. Fast debug playbook (post-implementation)

### "Typed flush returns null unexpectedly"

1. Confirm session is registered: `onSessionReady` fired for the target pane.
2. Check `isApplyingExternalValue` guard in session serialization path.
3. Run `npm run test -- tests/editor-session.test.ts`.

### "Images blink after slice 1"

1. Compare canonical value path — `rich-markdown-editor-value-sync.ts` unchanged.
2. Trace external apply in `editor-session-external-sync.ts`.
3. Run `npm run test -- tests/rich-markdown-editor-value-sync.test.ts`.

### "Tag underlines wrong after slice 2"

1. Confirm `subscribeContentMutated` fires on text-change.
2. Run tag overlay regression suite (§8.2 automated block).
3. See `mds/lessons-learned/README.md` tag/quill lessons.

### "Wrong pane saved"

1. Verify `editorSessionRefs.primary` vs `secondary` in `pane-editor.tsx`.
2. Trace `PaneWorkspace.flushPaneContent(pane)` — explicit pane argument required.
3. Run `npm run test -- tests/project-editor-debounce-regression.test.ts`.

## 12. Relationship to prior work

This plan continues the extraction started in `mds/plan/done/rich-editor-refactor-plan.md` (slices 1–5, completed 2026-04-28). That refactor created the modules this plan folds into `EditorSession`. It does not repeat those extractions — it deepens the seam above them.

Architecture review origin: improve-codebase-architecture skill, candidate #2 (rich editor seam sprawl).

## 13. Summary

```
Slice 1 ──► LayoutDirectiveController + EditorSession core + B2 pane seam
              │
              ▼  [gate: §7.2 automated + manual]
Slice 2 ──► Absorb find/focus/tags/zoom/toolbar + thin shell + delete old modules
              │
              ▼  [gate: §8.2 automated + manual + build]
```
