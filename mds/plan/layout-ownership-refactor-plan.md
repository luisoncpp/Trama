# Layout Ownership Refactor Plan (CSS / Flex / Grid Debuggability)

> **Status:** Plan only — no code in this document. Goal: make layout/flex/grid bugs
> easier to debug, easier to reason about, and harder to regress, via the *smallest
> correct* architectural change (not a rewrite). Preserve current UI/UX.

> **Audience:** This plan is written so a smaller/cheaper model can execute each step
> sequentially without inventing architecture. Every step names exact files, the exact
> responsibility being moved, the invariant it establishes, and how behavior is preserved.

---

## 0. Files in scope (canonical reference for all steps)

| Role | File |
|------|------|
| Shell class + sidebar width var owner | `src/features/project-editor/project-editor-view.tsx` |
| Grid wrapper that consumes `--sidebar-width` | `src/features/project-editor/project-editor-view-layout.tsx` |
| Sidebar shell memo + shell state/actions hooks | `src/features/project-editor/project-editor-shell.tsx` |
| Sidebar render + inline width + effective collapse | `src/features/project-editor/components/sidebar/sidebar-panel.tsx` |
| Responsive-collapse hook (`900px`) | `src/features/project-editor/components/sidebar/sidebar-explorer-hooks.ts` |
| Split-pane `--split-ratio` owner + drag | `src/features/project-editor/pane/workspace-editor-panels.tsx` |
| Per-pane shell (`workspace-split-pane__body`) | `src/features/project-editor/pane/pane-editor.tsx` |
| Editor surface host (`editor-manuscript`, Quill vs MapEditor) | `src/features/project-editor/pane/editor-panel.tsx` |
| All layout CSS (2688 lines) | `src/index.css` |
| Layout state source | `src/features/project-editor/project-editor-private/state.ts` (+ `state-values.ts`) |

New files this plan introduces (justified in §3):

- `src/features/project-editor/layout/layout-metrics.ts` — layout constants + width math (pure, no Preact).
- `src/features/project-editor/layout/use-sidebar-layout.ts` — single hook owning effective collapse + width.

No other new files are needed. See §3.0 for why the seam is exactly here and not finer-grained.

---

## 1. Diagnosis

### 1.1 The sidebar width is computed from divergent inputs in two owners

- **Space allocator (parent):** `buildSidebarStyle` in
  [project-editor-view.tsx:36-40](src/features/project-editor/project-editor-view.tsx#L36-L40)
  sets `--sidebar-width` from **`sidebarPanelCollapsed` only** (plus a focus-mode special case):
  `focusModeEnabled ? '0px' : ${sidebarPanelCollapsed ? 72 : sidebarPanelWidth}px`.
  This var feeds the grid column in
  [project-editor-view-layout.tsx:62](src/features/project-editor/project-editor-view-layout.tsx#L62)
  → consumed by `.editor-workspace { grid-template-columns: var(--sidebar-width, 300px) minmax(0,1fr) }`
  ([index.css:1257-1263](src/index.css#L1257-L1263)).
- **Visual renderer (child):** `useSidebarPanelRenderState` in
  [sidebar-panel.tsx:63-68](src/features/project-editor/components/sidebar/sidebar-panel.tsx#L63-L68)
  computes `effectiveCollapsed = props.sidebarPanelCollapsed || isResponsiveCollapsed`
  (where `isResponsiveCollapsed` comes from `useSidebarResponsiveCollapse`,
  [sidebar-explorer-hooks.ts:9-24](src/features/project-editor/components/sidebar/sidebar-explorer-hooks.ts#L9-L24),
  fires at `≤ 900px`). The `<aside>` then sets **its own** inline `width`
  ([sidebar-panel.tsx:119-122](src/features/project-editor/components/sidebar/sidebar-panel.tsx#L119-L122))
  `width: ${effectiveCollapsed ? 72 : props.sidebarPanelWidth}px` and the `is-collapsed` class.

**Bug class:** On viewports ≤ 900px, the parent grid allocates `sidebarPanelWidth` (e.g. 300px)
while the child renders at 72px → a dead gap between sidebar and editor. This is the exact
divergence documented in
[sidebar-width-responsive-collapse-sync.md](mds/lessons-learned/sidebar-width-responsive-collapse-sync.md).
The existing "fix" is to **duplicate** the `|| isResponsiveCollapsed` expression in both owners —
which is fragile by construction: nothing forces the two sites to stay equal.

### 1.2 Sidebar width is double-encoded (grid column AND inline width)

The sidebar's width is asserted **twice** for the same element: once as the grid track
(`--sidebar-width` on `.editor-workspace`) and once as an inline `width` on the `.sidebar-shell`
child ([sidebar-panel.tsx:121](src/features/project-editor/components/sidebar/sidebar-panel.tsx#L121)),
plus a third time as a CSS fallback `.sidebar-shell.is-collapsed { width: 72px }`
([index.css:1275-1277](src/index.css#L1275-L1277)). A grid child already fills its track
(`minmax`/fixed), so the inline width is redundant *when consistent* and actively wrong *when it
diverges* (§1.1). Two writers, one visual property.

### 1.3 The `72` rail width is a magic number in 4 places

`72` appears in: `buildSidebarStyle` ([project-editor-view.tsx:38](src/features/project-editor/project-editor-view.tsx#L38)),
the `<aside>` inline width ([sidebar-panel.tsx:121](src/features/project-editor/components/sidebar/sidebar-panel.tsx#L121)),
`.sidebar-shell.is-collapsed` ([index.css:1276](src/index.css#L1276)), and `.sidebar-rail`
([index.css:1285](src/index.css#L1285)). Collapsed width and rail width are conceptually the same
number (collapsed shell == just the rail) but nothing ties them together.

### 1.4 Breakpoints are uncoordinated across JS and CSS

- JS responsive collapse: `≤ 900px` ([sidebar-explorer-hooks.ts:3](src/features/project-editor/components/sidebar/sidebar-explorer-hooks.ts#L3)).
- CSS collapses `.editor-workspace` to a single column at `≤ 1100px` ([index.css:2627-2631](src/index.css#L2627-L2631)).
- CSS collapses `.workspace-split` to single column at `≤ 960px` ([index.css:2677-2685](src/index.css#L2677-L2685)).
- CSS shell padding/`editor-app` height changes at `≤ 720px` ([index.css:2633-2675](src/index.css#L2633-L2675)).

**Bug class:** Between **900px and 1100px** the grid is already single-column (`1fr`) — so the
sidebar and editor stack — but JS has *not* triggered responsive collapse, so `SidebarPanel`
still renders an expanded-width `<aside>`. The two layout systems disagree about what "narrow"
means. There is no single declared breakpoint table.

### 1.5 Focus-mode layout override is encoded in three places

Focus mode collapses the layout via: (a) the `is-focus-mode` class built in
`buildShellClassName` ([project-editor-view.tsx:25-34](src/features/project-editor/project-editor-view.tsx#L25-L34));
(b) a redundant `--sidebar-width: 0px` branch in `buildSidebarStyle`
([project-editor-view.tsx:38](src/features/project-editor/project-editor-view.tsx#L38)); and
(c) CSS rules `.is-focus-mode .sidebar-shell { display:none }` +
`.is-focus-mode .editor-workspace { grid-template-columns: 1fr }`
([index.css:210-217](src/index.css#L210-L217)). Because the CSS forces `grid-template-columns: 1fr`,
the `0px` var branch is **dead** — but a reader cannot know that without cross-referencing three
files. This is the precise `display:none` + grid-auto-place hazard from
[focus-mode-css-grid-display-none-auto-place.md](mds/lessons-learned/focus-mode-css-grid-display-none-auto-place.md):
the override must keep `display:none` paired with `grid-template-columns: 1fr` in the same owner.

### 1.6 The editor min-height:0 flex chain has two different ancestor paths

The "make the editor body fill height" contract depends on an unbroken chain of
`min-height: 0` + `flex: 1 1 auto` from `.editor-workspace` down to `.rich-editor` / `.map-editor`.
But the chain differs between modes:

- **Single pane** (`ActiveEditorPanel`, [workspace-editor-panels.tsx:34-75](src/features/project-editor/pane/workspace-editor-panels.tsx#L34-L75)):
  `.editor-main` → `.editor-panel-root` (no intermediate wrapper).
- **Split** (`PaneEditor`, [pane-editor.tsx:73-80](src/features/project-editor/pane/pane-editor.tsx#L73-L80)):
  `.editor-main` → `.workspace-split` → `.workspace-split-pane` → `.workspace-split-pane__body`
  → `.editor-panel-root`.

Each ancestor (`.editor-main` 1341-1346, `.workspace-split` 1390-1396, `.workspace-split-pane`
1398-1407, `.workspace-split-pane__body` 1495-1499, `.editor-panel-root` 1543-1548,
`.editor-manuscript` 1735-1744) independently re-declares `min-height: 0` / `flex` / `display:flex`.
A single missing declaration in either chain silently collapses the editor to 0px height. The
[map-editor-rendering-quirks.md](mds/lessons-learned/map-editor-rendering-quirks.md) lesson is a
direct symptom: `.editor-manuscript` lacked `display:flex; flex-direction:column`, so `.map-editor`
(`flex:1 1 auto`) collapsed. There is no single named "editor fill contract" — it is an emergent
property of ~7 selectors that nobody owns.

### 1.7 `index.css` has no layout-ownership structure

[index.css](src/index.css) is 2688 lines, ordered by *feature arrival* (theme vars → modals →
buttons → workspace → sidebar → split → map → quill → media queries). Layout-critical selectors
are scattered: `.editor-workspace` (1257), `.sidebar-shell` (1265), `.editor-main` (1341),
`.workspace-split` (1390), `.editor-manuscript` (1735), `.map-editor` (1746), and the four media
queries at the very bottom (2627-2686). To reason about "what allocates editor height" you must
scroll across ~1000 lines and three media queries. Layout rules and cosmetic rules are interleaved.

### 1.8 Summary of root causes (ranked)

1. **Fragmented ownership of sidebar width** — two owners, divergent inputs (§1.1, §1.2).
2. **No single layout-constants source** — magic numbers + breakpoints duplicated (§1.3, §1.4).
3. **Focus-mode override spread across JS + CSS with dead code** (§1.5).
4. **The editor fill contract is implicit and mode-dependent** (§1.6).
5. **CSS has no layout section boundaries** (§1.7).

The bug history (sidebar gap, map collapse, focus grid auto-place) is overwhelmingly about
*ownership ambiguity and weak invariants*, not isolated property typos. The refactor must make
ownership explicit and the invariants enforceable in one place each.

---

## 2. Target Architecture

### 2.1 Sidebar width — single owner

- **`useSidebarLayout(state)`** (new, `src/features/project-editor/layout/use-sidebar-layout.ts`)
  becomes the **single source of truth** for `{ effectiveCollapsed, sidebarWidthPx }`.
  It internally calls `useSidebarResponsiveCollapse()` and applies the collapse OR exactly once.
- `ProjectEditorView` calls `useSidebarLayout` and:
  - builds `--sidebar-width` from `sidebarWidthPx` (the **same** value), and
  - passes `effectiveCollapsed` (and the width) **down** to `SidebarPanel` via props.
- `SidebarPanel` **stops computing** `effectiveCollapsed` itself. It consumes the prop.
- The `<aside>` **stops setting an inline `width`**. The grid track (`--sidebar-width`) is the
  sole allocator; the `is-collapsed` class only governs *appearance* (hiding labels), not width.

Result: width is allocated once (grid track), derived once (`useSidebarLayout`), and the renderer
cannot disagree with the allocator because they read the same hook output.

### 2.2 Responsive collapse state — single owner

`useSidebarResponsiveCollapse` ([sidebar-explorer-hooks.ts](src/features/project-editor/components/sidebar/sidebar-explorer-hooks.ts))
stays the owner of the *viewport* breakpoint, but the breakpoint constant moves to
`layout-metrics.ts` (`SIDEBAR_RESPONSIVE_BREAKPOINT_PX = 900`). The hook is consumed **only**
through `useSidebarLayout`, never directly in two render paths. The CSS media-query breakpoint that
collapses `.editor-workspace` is aligned to the same number (see §4 and Step 6) so JS and CSS agree
on "narrow."

### 2.3 Split-pane sizing — keep the existing owner, name the constants

`WorkspaceSplitEditorPanels` ([workspace-editor-panels.tsx:88-119](src/features/project-editor/pane/workspace-editor-panels.tsx#L88-L119))
remains the owner of `--split-ratio` and the drag math. No ownership change (this code is correct
and isolated). Only the magic numbers move to `layout-metrics.ts`: `SPLIT_RATIO_MIN = 0.2`,
`SPLIT_RATIO_MAX = 0.8`, `SPLIT_DIVIDER_WIDTH_PX = 12`. The divider width `12px` in
`.workspace-split` grid template ([index.css:1394](src/index.css#L1394)) is documented as
"must equal `SPLIT_DIVIDER_WIDTH_PX`" via a CSS comment, but stays in CSS (CSS cannot import TS).

### 2.4 Focus-mode layout override — CSS is the single owner

- Remove the `--sidebar-width: 0px` focus branch from JS (it is dead, §1.5).
- Focus collapse remains **entirely** driven by the `is-focus-mode` class on `.editor-shell`
  (already produced by `buildShellClassName`) plus the two CSS rules that pair
  `display:none` on `.sidebar-shell` with `grid-template-columns: 1fr` on `.editor-workspace`.
- These two CSS rules are co-located in a dedicated "Focus mode layout overrides" section (§4) so
  the `display:none`/grid-template pairing invariant is visible in one place.

### 2.5 Editor fill contract — one named contract, two entry points

Introduce a single CSS contract class **`.editor-fill-column`** (utility) that encapsulates
`min-height: 0; flex: 1 1 auto; display: flex; flex-direction: column;` and apply it to the
surfaces that must satisfy the fill contract (`.editor-main`, `.workspace-split-pane`,
`.editor-manuscript`). The two ancestor chains (single-pane vs split) both terminate at
`.editor-manuscript`, which is the **one** guaranteed parent of both `RichMarkdownEditor` and
`MapEditor` ([editor-panel.tsx:139-175](src/features/project-editor/pane/editor-panel.tsx#L139-L175)).
The contract is documented as: *any element hosting an editor surface must carry the fill column
contract; any editor surface must use `flex: 1 1 auto; min-height: 0`.* See §4 and §5.

> Note: this is a CSS-class consolidation, **not** a new component. Per
> [layout-component-prevents-micro-file-proliferation.md](mds/lessons-learned/layout-component-prevents-micro-file-proliferation.md),
> we extract the *layout rule*, not wrapper components.

### 2.6 Map editor / non-text surfaces — same contract as Quill

`MapEditor` and `RichMarkdownEditor` are siblings under `.editor-manuscript`. The target state is
that **both** rely on the same `.editor-manuscript` fill contract (§2.5). No special-casing per
surface type. `.map-editor` keeps `flex: 1 1 auto; min-height: 0` ([index.css:1746-1755](src/index.css#L1746-L1755)),
`.rich-editor` keeps the same ([index.css:2112-2118](src/index.css#L2112-L2118)). The invariant in
§5 makes this explicit so a future third surface type inherits it for free.

### 2.7 Constants module — one source for layout magic numbers

`layout-metrics.ts` (pure TS, no Preact import) exports:

```
SIDEBAR_RAIL_WIDTH_PX = 72          // collapsed shell width == rail width
SIDEBAR_DEFAULT_WIDTH_PX = 300      // grid fallback default
SIDEBAR_RESPONSIVE_BREAKPOINT_PX = 900
SPLIT_RATIO_MIN = 0.2
SPLIT_RATIO_MAX = 0.8
SPLIT_DIVIDER_WIDTH_PX = 12
clampSplitRatio(value): number      // moved from workspace-editor-panels.tsx
sidebarWidthPx(effectiveCollapsed, panelWidth): number  // 72 | panelWidth
```

This is the single place TS code reads layout numbers. CSS keeps its own literals (CSS can't
import TS) but each CSS literal that mirrors a constant gets a `/* == SIDEBAR_RAIL_WIDTH_PX */`
comment so drift is auditable.

---

## 3. Step-by-Step Refactor Plan

> Execute in order. Each step is independently shippable and leaves the app behavior-identical
> unless explicitly noted. After each step run the verification listed in §6 for that phase before
> proceeding.

### 3.0 Why the new seam is `layout/` and not finer-grained

The repo's lint limits (`max-lines: 200`, `max-lines-per-function: 50`,
[START-HERE.md:78](mds/START-HERE.md#L78)) push toward extraction, but
[layout-component-prevents-micro-file-proliferation.md](mds/lessons-learned/layout-component-prevents-micro-file-proliferation.md)
warns against shallow modules. We therefore introduce **exactly two** new files — a pure constants/math
module and one hook — both *deep* (small interface, real behavior). We do **not** create per-metric
files or a "LayoutProvider" component. Sidebar width is the only piece with genuine dual-owner
divergence, so it is the only piece that gets a dedicated hook.

---

### Step 1 — Introduce `layout-metrics.ts` (constants + pure math)

- **Create:** `src/features/project-editor/layout/layout-metrics.ts` with the exports in §2.7.
- **Move:** `clampRatio` from
  [workspace-editor-panels.tsx:12-14](src/features/project-editor/pane/workspace-editor-panels.tsx#L12-L14)
  into this module as `clampSplitRatio`, using `SPLIT_RATIO_MIN`/`SPLIT_RATIO_MAX`.
- **Importers after this step:** `workspace-editor-panels.tsx` imports `clampSplitRatio`.
- **Behavior preserved:** `clampSplitRatio` is identical logic (`Math.min(0.8, Math.max(0.2, v))`).
  No other file changes behavior yet — constants are defined but not yet consumed elsewhere.
- **Invariant established:** *There is exactly one place where layout numbers are defined in TS.*
- **Dependencies:** none. Do this first.
- **Risk:** trivial. Verify `clampSplitRatio` is referenced where `clampRatio` was; remove the old
  local `clampRatio`.

### Step 2 — Create `use-sidebar-layout.ts` (single source for collapse + width)

- **Create:** `src/features/project-editor/layout/use-sidebar-layout.ts` exporting
  `useSidebarLayout(args: { sidebarPanelCollapsed: boolean; sidebarPanelWidth: number }):
  { effectiveCollapsed: boolean; sidebarWidthPx: number }`.
- **Internals:** call `useSidebarResponsiveCollapse()`; compute
  `effectiveCollapsed = sidebarPanelCollapsed || isResponsiveCollapsed`; compute
  `sidebarWidthPx = sidebarWidthPx(effectiveCollapsed, sidebarPanelWidth)` from `layout-metrics`.
- **Importers after this step:** none yet (introduced, wired in Steps 3-4).
- **Behavior preserved:** This hook reproduces *exactly* the expression currently in
  `useSidebarPanelRenderState` ([sidebar-panel.tsx:65](src/features/project-editor/components/sidebar/sidebar-panel.tsx#L65)),
  so wiring it in is behavior-neutral for the child and *corrects* the parent.
- **Invariant established:** *Effective collapse is computed in exactly one function.*
- **Dependencies:** Step 1 (uses `sidebarWidthPx`).
- **Risk:** none until wired.

### Step 3 — Make `ProjectEditorView` consume `useSidebarLayout` for the width var

- **Edit:** [project-editor-view.tsx](src/features/project-editor/project-editor-view.tsx).
  - Replace `buildSidebarStyle(sidebarPanelCollapsed, sidebarPanelWidth, focusModeEnabled)`
    ([lines 36-40](src/features/project-editor/project-editor-view.tsx#L36-L40)) so it takes the
    `sidebarWidthPx` from `useSidebarLayout` and produces `{ '--sidebar-width': ${sidebarWidthPx}px }`.
  - **Remove the focus-mode branch** (`focusModeEnabled ? '0px' : ...`). Focus collapse is owned by
    CSS (§2.4); the var becomes irrelevant under `is-focus-mode` because CSS forces
    `grid-template-columns: 1fr` ([index.css:214-217](src/index.css#L214-L217)).
  - In `ProjectEditorView` body ([lines 120-149](src/features/project-editor/project-editor-view.tsx#L120-L149)),
    call `const { effectiveCollapsed, sidebarWidthPx } = useSidebarLayout({ sidebarPanelCollapsed:
    shellState.sidebarPanelCollapsed, sidebarPanelWidth: shellState.sidebarPanelWidth })`.
  - Thread `effectiveCollapsed` into `layoutProps` so it reaches `SidebarPanel` (see Step 4).
- **Behavior change (intended fix):** On `≤ 900px`, the grid track now equals the rendered sidebar
  width → the §1.1 gap disappears. This is the one user-visible correction; everything else is
  identical.
- **Invariant established:** *The grid track and the rendered sidebar derive width from the same
  hook output.*
- **Dependencies:** Steps 1-2.
- **Risk:** focus mode. **Verify before moving on:** toggling focus mode (`Ctrl/Cmd+Shift+M`) still
  hides the sidebar and gives the editor full width (CSS path), and the var no longer needs the
  `0px` branch. Confirm `buildShellClassName` still emits `is-focus-mode`
  ([project-editor-view.tsx:31](src/features/project-editor/project-editor-view.tsx#L31)).

### Step 4 — Pass `effectiveCollapsed` down; stop recomputing it in `SidebarPanel`

- **Edit prop plumbing:** add `effectiveCollapsed: boolean` to the shell prop contract in
  `project-editor-shell-props.ts` (the `buildSidebarSectionProps` builder used by
  `ProjectEditorSidebarShell`, [project-editor-shell.tsx:12-16](src/features/project-editor/project-editor-shell.tsx#L12-L16)),
  and into `ProjectEditorLayout` → `ProjectEditorSidebarShell` props in
  [project-editor-view-layout.tsx:63-79](src/features/project-editor/project-editor-view-layout.tsx#L63-L79).
- **Edit:** [sidebar-panel.tsx](src/features/project-editor/components/sidebar/sidebar-panel.tsx).
  - In `useSidebarPanelRenderState` ([lines 63-68](src/features/project-editor/components/sidebar/sidebar-panel.tsx#L63-L68)),
    **remove** the `useSidebarResponsiveCollapse()` call and the local
    `effectiveCollapsed` computation; take `effectiveCollapsed` from props.
  - In the `<aside>` ([lines 118-122](src/features/project-editor/components/sidebar/sidebar-panel.tsx#L118-L122)),
    **delete the inline `style={{ width: ... }}`** entirely. Keep the
    `class="sidebar-shell ${effectiveCollapsed ? 'is-collapsed' : ''}"`. Width now comes solely
    from the grid track (parent) via `--sidebar-width`.
- **Behavior preserved:** `effectiveCollapsed` value is identical (now sourced from the same hook
  as the parent). The `<aside>` previously had both a grid track *and* an inline width; with
  consistent inputs these were equal, so removing the inline width is visually identical — and it
  *removes the second writer* that caused divergence.
- **Invariant established:** *The sidebar element has exactly one width writer (the grid track).
  `is-collapsed` controls appearance only.*
- **Dependencies:** Step 3 (the prop must be produced before it is consumed).
- **Risk:** `.sidebar-shell.is-collapsed { width: 72px }` ([index.css:1275-1277](src/index.css#L1275-L1277))
  is now redundant for the grid case but harmless. **Verify** the collapsed sidebar (rail-only)
  still renders at 72px in both wide and narrow viewports and in both single/split modes. Confirm
  `useSidebarResponsiveCollapse` now has exactly one caller (`use-sidebar-layout.ts`).

### Step 5 — Replace the `72` magic numbers with the constant (TS) and annotate CSS

- **Edit:** any remaining TS literal `72` related to sidebar collapse now flows from
  `sidebarWidthPx`/`SIDEBAR_RAIL_WIDTH_PX` (after Steps 3-4 the only TS `72` should already be gone;
  confirm none remain via grep).
- **Edit CSS:** add `/* == SIDEBAR_RAIL_WIDTH_PX (layout-metrics.ts) */` next to
  `.sidebar-shell.is-collapsed { width: 72px }` ([index.css:1276](src/index.css#L1276)) and
  `.sidebar-rail { width: 72px }` ([index.css:1285](src/index.css#L1285)).
- **Invariant established:** *Every `72` in the codebase is traceable to one named constant.*
- **Dependencies:** Steps 1, 3, 4.
- **Risk:** none (comments + confirmation only).

### Step 6 — Align the JS and CSS "narrow" breakpoints

- **Decision required:** the JS responsive collapse (`900`) and the CSS single-column grid
  (`1100`, [index.css:2627-2631](src/index.css#L2627-L2631)) disagree (§1.4). Align them to a single
  value. **Recommended:** change the CSS media query from `1100px` to `900px` so the grid collapses
  to a single column at the exact viewport where JS collapses the sidebar to the rail. (Alternative:
  raise `SIDEBAR_RESPONSIVE_BREAKPOINT_PX` to 1100 — but 900 matches current JS-collapse UX, so
  prefer changing CSS.)
- **Edit CSS:** in [index.css:2627](src/index.css#L2627) change `@media (max-width: 1100px)` to
  `@media (max-width: 900px)`, with a comment `/* == SIDEBAR_RESPONSIVE_BREAKPOINT_PX */`.
- **Behavior change (intended):** removes the 900-1100px dead zone where grid was single-column but
  sidebar still rendered expanded.
- **Invariant established:** *JS and CSS use one agreed "narrow" threshold; both annotated.*
- **Dependencies:** Step 4 (so the sidebar already renders collapsed at ≤900 cleanly).
- **Risk:** medium — this changes layout in the 900-1100px band. **Verify** by resizing across
  880/900/1000/1100px: at ≤900 the sidebar is rail-only and the grid is single-column consistently;
  no gap, no double sidebar. This is the highest-risk behavioral step — ship it separately from
  Steps 1-5 if staging changes.

### Step 7 — Introduce the `.editor-fill-column` CSS contract

- **Edit:** [index.css](src/index.css). Add a utility rule
  `.editor-fill-column { min-height: 0; flex: 1 1 auto; display: flex; flex-direction: column; }`
  in the new "Editor fill contract" section (§4).
- **Apply** the class in markup to the three fill-contract hosts (additive — keep existing classes):
  - `.editor-main` div ([project-editor-view-layout.tsx:35](src/features/project-editor/project-editor-view-layout.tsx#L35)).
  - `.workspace-split-pane` section ([pane-editor.tsx:74](src/features/project-editor/pane/pane-editor.tsx#L74)).
  - `.editor-manuscript` div ([editor-panel.tsx:139](src/features/project-editor/pane/editor-panel.tsx#L139)).
- **Then** remove the now-duplicated `min-height/flex/display/flex-direction` declarations from the
  corresponding selectors in CSS (`.editor-main` 1341-1346, `.editor-manuscript` 1735-1744,
  `.workspace-split-pane` 1398-1407) — **keeping** their non-contract properties (borders, gaps,
  backgrounds, radius, transitions). `.workspace-split-pane__body` (1495-1499) and
  `.editor-panel-root` (1543-1548) stay as-is (their `display:flex` is `row`, not part of the column
  contract) but get a comment cross-referencing the contract.
- **Behavior preserved:** the contract class sets the *same* properties currently set inline per
  selector, so computed layout is identical. This is a consolidation, not a change.
- **Invariant established:** *Every element that hosts an editor surface carries `.editor-fill-column`;
  the fill contract is defined once.* (See §5.)
- **Dependencies:** independent of Steps 1-6; can be done in parallel, but do it after the sidebar
  work to keep diffs small.
- **Risk:** medium — a missed property during consolidation collapses the editor to 0px.
  **Verify** (real Chromium, not JSDOM — per
  [map-editor-rendering-quirks.md](mds/lessons-learned/map-editor-rendering-quirks.md)) that both
  a text doc and a map doc fill height in single and split modes.

### Step 8 — Co-locate focus-mode layout overrides and document the pairing

- **Edit CSS:** move the two focus *layout* rules
  (`.is-focus-mode .sidebar-shell { display:none }`,
  `.is-focus-mode .editor-workspace { grid-template-columns: 1fr; gap: 0 }`,
  [index.css:210-217](src/index.css#L210-L217)) into the dedicated "Focus mode layout overrides"
  section (§4), adjacent, with a comment: *"display:none on a grid child must be paired with a
  recalculated grid-template; see focus-mode-css-grid-display-none-auto-place lesson."* Leave the
  focus *cosmetic* rules (scrollbar dimming, `.ql-editor.is-focus-mode` spacers/emphasis) where they
  are in the Quill section — they are not layout-allocation rules.
- **Behavior preserved:** pure reordering of identical rules.
- **Invariant established:** *Focus-mode space-allocation overrides live in one CSS block, next to
  the pairing rationale.*
- **Dependencies:** Step 3 (the `0px` var branch is already gone, so CSS is unambiguously the owner).
- **Risk:** low. Verify focus mode visually unchanged.

### Step 9 — (Optional, do last) Split `index.css` by layout ownership — see §4

Only execute if §4's file-split option is chosen. Otherwise keep one file with the section markers
from §4. This step is deliberately last and reversible.

---

## 4. CSS Restructuring Plan

### 4.1 Recommendation: keep ONE file, add strict ownership sections

**Rationale (repo-specific):** Vite + Tailwind v4 (`@import 'tailwindcss'` at
[index.css:1](src/index.css#L1)) and the Quill theme overrides rely on a single predictable cascade
order. Quill's `.ql-*` overrides ([index.css:2110-2625](src/index.css#L2110-L2625)) must load after
base styles, and focus/find/tag overlays depend on source order. Splitting into many files risks
cascade-order regressions for marginal benefit, and the codebase has a documented
[css-patch-corruption.md](mds/lessons-learned/css-patch-corruption.md) hazard around CSS edits.
**Keep `src/index.css` as one file**, but impose explicit, banner-delimited sections ordered by
*layout ownership*, not feature arrival.

### 4.2 Mandatory section order (top → bottom), with banner comments

```
/* ===== 1. THEME TOKENS ===== */            :root + html[data-theme='light']      (current 3-172)
/* ===== 2. BASE / RESET ===== */            *, html, body, #app, form elements     (174-199)
/* ===== 3. APP SHELL LAYOUT ===== */         .editor-shell, .editor-app,
                                              .editor-workspace, .editor-main        (201-258, 1257-1346)
/* ===== 4. FOCUS-MODE LAYOUT OVERRIDES ===== */  is-focus-mode display:none + grid 1fr   (210-217 moved here)
/* ===== 5. SIDEBAR LAYOUT ===== */           .sidebar-shell, .sidebar-rail,
                                              .sidebar-panel-content                 (1265-1339)
/* ===== 6. SPLIT-PANE LAYOUT ===== */        .workspace-split*, divider             (1390-1521)
/* ===== 7. EDITOR FILL CONTRACT ===== */     .editor-fill-column, .editor-panel-root,
                                              .editor-manuscript, .map-editor fill    (1495-1548, 1735-1755)
/* ===== 8. COMPONENT COSMETICS ===== */      buttons, modals, dialogs, tree rows,
                                              revisions rail, conflict banners, toasts (cosmetic only)
/* ===== 9. QUILL THEME OVERRIDES (.ql-*) ===== */  (2110-2625) — MUST stay global, owned by Quill
/* ===== 10. RESPONSIVE / MEDIA QUERIES ===== */    all @media, breakpoints annotated  (2627-2686)
```

### 4.3 Boundary rules (how a future contributor knows where a selector goes)

- **Sections 3-7 = "space allocation" only:** any selector that sets `display:grid/flex`,
  `grid-template-*`, `flex`, `min-height:0`, `min-width:0`, `width/height` of a *structural* box, or
  `--sidebar-width`/`--split-ratio` lives here.
- **Section 8 = "cosmetics":** borders, backgrounds, colors, radius, padding *that does not affect
  the fill chain*, transitions, hover states.
- **Section 9 = Quill, untouchable structure:** never inject DOM into `.ql-editor`
  ([START-HERE.md:85](mds/START-HERE.md#L85)); these rules theme Quill's own DOM and must remain
  global because Quill renders outside our component tree.
- **Section 10:** every `@media` breakpoint carries a comment tying it to a `layout-metrics.ts`
  constant where one exists (esp. the `900px` from Step 6).

### 4.4 What must stay global (do not move closer to components)

- All `.ql-*` Quill overrides (Quill owns that DOM; Section 9).
- Theme tokens (`:root`, `html[data-theme]`) — app-level theming consumed everywhere (Section 1).
- Focus overlay/highlight rules tied to `::highlight(trama-focus-scope)` and `.ql-editor` pseudo
  spacers — these depend on Quill's DOM and the documented focus invariants
  ([focus-mode-centered-scroll-spacers.md](mds/lessons-learned/focus-mode-centered-scroll-spacers.md)).

### 4.5 Cross-surface coupling reduction

- The `.editor-fill-column` contract (Step 7) collapses ~7 scattered `min-height:0`/`flex`
  declarations into one rule + three usages, so the editor-height contract is no longer
  cross-surface tribal knowledge.
- Removing the inline `<aside>` width (Step 4) means sidebar width is no longer coupled across a
  TSX inline style + a CSS class + a grid var — only the grid var remains.

> If, after these steps, the team still wants physical file splits, the section banners in §4.2 are
> the exact cut lines: each `/* ===== N. ===== */` block becomes `styles/NN-name.css`, imported in
> numeric order from `index.css` after `@import 'tailwindcss'`. Do this as the isolated Step 9 only,
> with a visual diff of the rendered app before/after.

---

## 5. Invariants to Enforce

Each invariant names the code location that enforces it after the refactor.

1. **Single effective-collapse source.** Effective sidebar collapse is computed only in
   `useSidebarLayout` (`layout/use-sidebar-layout.ts`). `useSidebarResponsiveCollapse`
   ([sidebar-explorer-hooks.ts](src/features/project-editor/components/sidebar/sidebar-explorer-hooks.ts))
   must have exactly one caller (that hook). *Enforced by:* grep guard test (§6) asserting a single
   import of `useSidebarResponsiveCollapse`.

2. **Single sidebar-width writer.** The sidebar's width is set only by the `--sidebar-width` grid
   track on `.editor-workspace`. `.sidebar-shell` must carry no inline `width` and no JS-set width.
   *Enforced by:* `sidebar-panel.tsx` `<aside>` has `class` but no `style.width`
   ([sidebar-panel.tsx:118-122](src/features/project-editor/components/sidebar/sidebar-panel.tsx#L118-L122));
   width math lives only in `layout-metrics.sidebarWidthPx`.

3. **One narrow breakpoint.** `SIDEBAR_RESPONSIVE_BREAKPOINT_PX` (TS) and the `.editor-workspace`
   single-column `@media` (CSS) are the same number. *Enforced by:* the CSS comment
   `/* == SIDEBAR_RESPONSIVE_BREAKPOINT_PX */` at [index.css:2627](src/index.css#L2627) and a
   reviewer checklist item.

4. **Focus collapse is CSS-only and grid-safe.** Any `display:none` on a grid child
   (`.is-focus-mode .sidebar-shell`) is paired with a recalculated `grid-template-columns: 1fr` on
   the owning grid (`.editor-workspace`), co-located in the Focus-mode layout section. No JS sets
   `--sidebar-width: 0px`. *Enforced by:* §4 Section 4 co-location + the removal in Step 3.

5. **Editor fill contract.** Any element that hosts an editor surface (`.editor-main`,
   `.workspace-split-pane`, `.editor-manuscript`) carries `.editor-fill-column`. Any editor surface
   (`.rich-editor`, `.map-editor`, future surfaces) uses `flex: 1 1 auto; min-height: 0`.
   *Enforced by:* `.editor-fill-column` defined once (§4 Section 7); markup classes in
   [project-editor-view-layout.tsx:35](src/features/project-editor/pane/../project-editor-view-layout.tsx#L35),
   [pane-editor.tsx:74](src/features/project-editor/pane/pane-editor.tsx#L74),
   [editor-panel.tsx:139](src/features/project-editor/pane/editor-panel.tsx#L139).

6. **Both editor mode-paths terminate at the same host.** Single-pane and split paths both render
   the editor inside `.editor-manuscript`
   ([editor-panel.tsx:139](src/features/project-editor/pane/editor-panel.tsx#L139)); the fill
   contract therefore needs to hold on exactly one shared element regardless of mode. *Enforced by:*
   `EditorPanel` being the only renderer of `RichMarkdownEditor`/`MapEditor`.

7. **One layout-constants source.** All TS layout numbers (`72`, `900`, `0.2`, `0.8`, `12`, `300`)
   come from `layout-metrics.ts`; CSS literals mirroring them carry a `/* == CONSTANT */` comment.
   *Enforced by:* grep guard test (§6) for stray numeric literals in the layout files.

8. **Split sizing stays pane-local.** `--split-ratio` is written only by
   `WorkspaceSplitEditorPanels` ([workspace-editor-panels.tsx:112](src/features/project-editor/pane/workspace-editor-panels.tsx#L112));
   ratio clamping only via `clampSplitRatio`. *Enforced by:* single writer + the constant move in
   Step 1.

---

## 6. Regression and Verification Plan

> JSDOM has no layout engine ([map-editor-rendering-quirks.md](mds/lessons-learned/map-editor-rendering-quirks.md)):
> height-collapse and grid-track bugs **cannot** be caught in Vitest. Treat manual Chromium checks
> as the primary gate for fill/grid steps, and use Vitest only for the *logic* invariants.

### Phase A — Sidebar width/collapse (Steps 1-5)

- **Focused tests (Vitest, add if missing):**
  - `tests/layout-metrics.test.ts` (new): `sidebarWidthPx(true, 300) === 72`,
    `sidebarWidthPx(false, 300) === 300`, `clampSplitRatio` bounds.
  - `tests/use-sidebar-layout.test.ts` (new): mock `window.innerWidth`; assert
    `effectiveCollapsed` is true when either input is true; assert `sidebarWidthPx` matches.
  - Grep guard test: assert `useSidebarResponsiveCollapse` has exactly one import site
    (invariant 1) and no `style={{ width` in `sidebar-panel.tsx` (invariant 2).
- **Manual checks (Chromium):** resize across 880/900/1000/1100px; toggle rail collapse; switch
  sections on a narrow viewport (the exact §1.1 repro). **Confirm no gap** between sidebar and editor.
- **Most likely to regress:** the §1.1 gap reappearing if `effectiveCollapsed` is not threaded all
  the way to `SidebarPanel`; collapsed rail width drifting from 72px.

### Phase B — Breakpoint alignment (Step 6)

- **Manual checks (Chromium):** the 900-1100px band specifically — sidebar must be rail-only and grid
  single-column simultaneously; no expanded sidebar over a single-column grid.
- **Most likely to regress:** users on ~1000px-wide windows seeing the sidebar collapse earlier than
  before (intended, but confirm it's acceptable UX).

### Phase C — Editor fill contract (Step 7)

- **Tests:** existing pane/editor tests must still pass; add no JSDOM height assertions (they can't
  detect collapse).
- **Manual checks (Chromium), all four combinations:** {single-pane, split} × {text doc, map doc}.
  Editor body and map stage must fill available height with no 0px collapse and no double scrollbars.
  Re-run the map-collapse scenario from the lesson.
- **Most likely to regress:** `.editor-manuscript` losing `display:flex; flex-direction:column`
  during consolidation → map collapses to 0px (the documented failure).

### Phase D — Focus mode (Steps 3 & 8)

- **Tests:** existing focus-mode tests (the CSS-vars-on-activate test referenced in
  [focus-mode-css-vars-sync-init.md](mds/lessons-learned/focus-mode-css-vars-sync-init.md)) must
  still pass — the refactor does not touch focus rendering internals.
- **Manual checks (Chromium):** `Ctrl/Cmd+Shift+M` hides sidebar and gives editor full width; `ESC`
  restores; typewriter centering at EOF still works (spacers unchanged).
- **Most likely to regress:** removing the `0px` var branch (Step 3) — confirm the CSS grid `1fr`
  override still wins and the editor isn't auto-placed into a 0px column.

### Phase E — Split pane sizing (Step 1)

- **Tests:** existing split-pane tests
  ([split-pane-coordination.md](mds/architecture/split-pane-coordination.md) suite) pass unchanged;
  `clampSplitRatio` covered by `tests/layout-metrics.test.ts`.
- **Manual checks:** drag divider to extremes; ratio clamps to 20%/80%; divider stays 12px.

### Priority order if time-boxed

1. Sidebar collapse/width (Phase A) — the canonical recurring bug.
2. Responsive (Phase B).
3. Focus mode (Phase D).
4. Editor fill / map rendering (Phase C).
5. Split sizing (Phase E).

---

## 7. Documentation Updates Needed

Per [START-HERE.md](mds/START-HERE.md) anti-forget checks, the following are required **in the same
task** as implementation:

1. **`mds/live/file-map.md`** — add the two new files (`layout/layout-metrics.ts`,
   `layout/use-sidebar-layout.ts`) with ownership notes ("single source for layout constants /
   effective sidebar collapse").

2. **`mds/lessons-learned/sidebar-width-responsive-collapse-sync.md`** — update the "Invariant
   going forward" section: the fix is no longer "duplicate the expression in both owners" but
   "both owners consume `useSidebarLayout`; effective collapse is computed once." Mark the old
   duplicate-expression approach as superseded.

3. **`mds/lessons-learned/README.md`** — add a one-line entry pointing at a new lesson
   `layout-ownership-single-writer.md` summarizing: (a) sidebar width has one writer (the grid
   track); (b) `.editor-fill-column` is the named fill contract; (c) JS/CSS share one narrow
   breakpoint.

4. **New `mds/architecture/layout-ownership.md`** (small) — the canonical map: which module owns
   sidebar width (`useSidebarLayout` + grid track), responsive state
   (`useSidebarResponsiveCollapse`), split sizing (`WorkspaceSplitEditorPanels` + `--split-ratio`),
   focus override (CSS `is-focus-mode` section), and the editor fill contract. Link it from
   `mds/architecture/README.md` and from the sidebar/focus/split architecture docs.

5. **`mds/architecture/sidebar-architecture.md`** and **`focus-mode-architecture.md`** — add a
   pointer to `layout-ownership.md` and note that focus collapse is CSS-only (no `--sidebar-width:0px`).

6. **`src/index.css` header comment** — document the §4.2 section order so the structure is
   self-describing at the top of the file.

7. **`mds/live/current-status.md`** — no feature change, but add a one-line note under a
   maintenance/refactor heading if that section exists, recording that layout ownership was
   consolidated (so future readers know the dual-owner pattern was intentional history, now removed).

---

## 8. Execution order summary (for the implementing model)

```
Step 1  layout-metrics.ts (constants + clampSplitRatio)          [safe]
Step 2  use-sidebar-layout.ts (effective collapse + width)       [safe, not yet wired]
Step 3  ProjectEditorView consumes useSidebarLayout; drop 0px    [fixes §1.1 on parent side]
Step 4  SidebarPanel consumes prop; remove inline width          [fixes §1.1; single writer]
Step 5  replace 72 literals; annotate CSS                        [safe]
Step 6  align JS/CSS narrow breakpoint to 900                    [behavioral — verify band]
Step 7  .editor-fill-column contract; consolidate min-height:0   [verify in Chromium]
Step 8  co-locate focus-mode layout CSS                          [reorder only]
Step 9  (optional) physical CSS split along §4.2 cut lines       [last, reversible]
docs   update file-map, lessons, new layout-ownership.md        [same task]
```

Steps 1-5 are one cohesive PR (sidebar ownership). Step 6 should be its own PR (behavioral). Step 7
its own PR (fill contract). Steps 8-9 + docs can ride with Step 7 or follow.
