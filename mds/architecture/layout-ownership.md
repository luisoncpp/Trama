# Layout Ownership

Goal: document which module owns each layout decision in the project editor so sidebar/grid/flex bugs can be localized without broad code searches.

## Ownership map

| Concern | Single owner | Notes |
|------|------|------|
| Sidebar effective collapse + width math | `src/features/project-editor/layout/use-sidebar-layout.ts` | Calls `useSidebarResponsiveCollapse()`, computes `effectiveCollapsed`, returns `sidebarWidthPx` |
| Layout constants and pure width/ratio math | `src/features/project-editor/layout/layout-metrics.ts` | Single TS source for `72`, `300`, `260–460`, `900`, split ratio bounds, divider width |
| Sidebar viewport breakpoint detection | `src/features/project-editor/components/sidebar/sidebar-explorer-hooks.ts` | Exposes `useSidebarResponsiveCollapse()`, consumed only through `useSidebarLayout` |
| Sidebar width allocation | `.editor-workspace` grid track in `src/styles/03-app-shell-layout.css` + `--sidebar-width` from `project-editor-view.tsx` | `.sidebar-shell` no longer owns width inline |
| Sidebar drag resize writes | `src/features/project-editor/layout/sidebar-resize-handle.tsx` + `project-editor-view-layout.tsx` | Handle mounts on `.editor-workspace` (not inside `.sidebar-column`); positioned with `left: calc(var(--sidebar-width) + 1px)` |
| Sidebar rendering state | `src/features/project-editor/components/sidebar/sidebar-panel.tsx` | Consumes `effectiveCollapsed` prop; `is-collapsed` changes appearance only |
| Focus-mode sidebar collapse | CSS in `src/styles/04-focus-mode-layout-overrides.css` | Must keep `display:none` paired with `grid-template-columns: 1fr` |
| Split ratio state and drag writes | `src/features/project-editor/pane/workspace-editor-panels.tsx` | Sole writer of `--split-ratio`; clamping uses `clampSplitRatio()` |
| Editor fill contract | `.editor-fill-column` in `src/styles/07-editor-fill-contract.css` | Applied to `.editor-main`, `.workspace-split-pane`, `.editor-manuscript` |

## End-to-end flow

### Sidebar width

1. Persisted sidebar state provides `sidebarPanelCollapsed` and `sidebarPanelWidth`.
2. `useSidebarLayout()` combines that state with `useSidebarResponsiveCollapse()`.
3. `ProjectEditorView` writes the returned `sidebarWidthPx` into `--sidebar-width`.
4. `.editor-workspace` consumes `--sidebar-width` as the first grid track.
5. `SidebarPanel` receives the same `effectiveCollapsed` value for rail/body rendering.
6. When expanded and not in focus mode, `SidebarResizeHandle` in `project-editor-view-layout.tsx` writes width changes through `setSidebarPanelWidth`.

Invariant: the grid track and the rendered sidebar always derive from the same hook output.

### Focus mode

1. `ProjectEditorView` adds the `is-focus-mode` shell class.
2. CSS hides `.sidebar-shell` with `display:none`.
3. CSS simultaneously switches `.editor-workspace` to `grid-template-columns: 1fr`.

Invariant: no JS path sets `--sidebar-width: 0px` for focus mode.

### Editor fill chain

1. `.editor-main`, `.workspace-split-pane`, and `.editor-manuscript` all carry `.editor-fill-column`.
2. `.editor-panel-root`, `.workspace-split-pane__body`, `.rich-editor`, and `.map-editor` keep `flex: 1 1 auto; min-height: 0` where needed.
3. Both single-pane and split-pane paths terminate at `.editor-manuscript` before rendering `RichMarkdownEditor` or `MapEditor`.

Invariant: any new editor surface should mount inside an `.editor-fill-column` host and itself honor `flex: 1 1 auto; min-height: 0`.

## Key files

- `src/features/project-editor/layout/layout-metrics.ts`
- `src/features/project-editor/layout/sidebar-resize-handle.tsx`
- `src/features/project-editor/layout/use-sidebar-layout.ts`
- `src/features/project-editor/project-editor-view.tsx`
- `src/features/project-editor/project-editor-view-layout.tsx`
- `src/features/project-editor/project-editor-shell-props.ts`
- `src/features/project-editor/components/sidebar/sidebar-panel.tsx`
- `src/features/project-editor/components/sidebar/sidebar-explorer-hooks.ts`
- `src/features/project-editor/pane/workspace-editor-panels.tsx`
- `src/features/project-editor/pane/pane-editor.tsx`
- `src/features/project-editor/pane/editor-panel.tsx`
- `src/index.css`
- `src/styles/03-app-shell-layout.css`
- `src/styles/04-focus-mode-layout-overrides.css`
- `src/styles/07-editor-fill-contract.css`
- `src/styles/10-responsive.css`

## Debug playbook

1. Sidebar gap on narrow viewport: inspect `useSidebarLayout()` output, then verify `--sidebar-width` on `.editor-workspace` and `effectiveCollapsed` on `SidebarPanel` match.
2. Focus mode makes editor disappear: verify the focus-mode CSS block still pairs `display:none` on `.sidebar-shell` with `grid-template-columns: 1fr` on `.editor-workspace`.
3. Map/text editor collapses vertically: verify each host in the active path still carries `.editor-fill-column`.
4. Split divider behaves oddly: check `WorkspaceSplitEditorPanels` for the only `--split-ratio` write and `clampSplitRatio()` in `layout-metrics.ts`.
5. Sidebar drag resize ignored or jumps: verify `SidebarResizeHandle` is mounted from `project-editor-view-layout.tsx`, `.editor-workspace` ref bounds match the grid track, and `clampSidebarWidth()` in `layout-metrics.ts`.

## References

- `mds/architecture/sidebar-architecture.md`
- `mds/architecture/focus-mode-architecture.md`
- `mds/architecture/split-pane-coordination.md`
- `mds/lessons-learned/sidebar-width-responsive-collapse-sync.md`
- `mds/lessons-learned/focus-mode-css-grid-display-none-auto-place.md`
- `mds/lessons-learned/map-editor-rendering-quirks.md`
