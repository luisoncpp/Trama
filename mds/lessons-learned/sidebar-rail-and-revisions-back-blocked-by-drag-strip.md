# Sidebar rail and revisions-rail back button blocked by titlebar drag strip

Date: 2026-06-06

## Context

On Windows, the app uses a custom overlay titlebar (`titleBarStyle: 'hidden'`, `frame: false`) and paints a thin 32px drag strip across the top of the viewport (`.window-drag-region` in `src/styles/03-app-shell-layout.css:29-38`). The strip uses `-webkit-app-region: drag` and `pointer-events: none` so the OS treats the top 32px as a window-drag handle while clicks still fall through to whatever is painted beneath it.

The header strip already opts its children out (`.workspace-panel__header *`, `.workspace-split-pane__header *`, `.ql-toolbar.ql-snow button`), so sidebar headers, pane headers, and the Quill toolbar work correctly.

## Symptom

- The topmost button in the **sidebar rail** (Manuscript explorer, Outline, Lore, Import/Export, Settings) only responds to clicks in its lower half. The upper ~18px of each 40px-tall button is consumed by the OS as a window-drag gesture.
- The **revisions-rail back button** (`.revisions-rail__back`, the `←` arrow at the top of the right rail) only responds in its lower part. With `line-height: 1` + `padding: 2px 4px` the button is ~22px tall and roughly the upper 14-16px fall inside the drag strip.

Both controls sit inside the drag strip (sidebar rail padding puts the first button at ~y=14, revisions-rail padding puts the back button at ~y=16) but neither was opted out of the drag region.

## Root cause

Electron/Chromium treats any element whose bounding box intersects an area with `-webkit-app-region: drag` as a drag target unless that element (or an ancestor) carries `-webkit-app-region: no-drag`. The `.window-drag-region` overlay is a `position: fixed` strip with `pointer-events: none` — pointer events fall through, but the window-level drag region is still active in that 32px band.

The opt-out list in `src/styles/03-app-shell-layout.css:106-120` only covers the three header/toolbar selectors. The sidebar rail and revisions-rail back button were not in the list, so the upper half of each control was treated as drag.

## Fix

Append the two new selectors to the existing `no-drag` block in `src/styles/03-app-shell-layout.css`:

```css
html.has-overlay-titlebar .sidebar-rail *,
html.has-overlay-titlebar .revisions-rail__header * {
  -webkit-app-region: no-drag;
}
```

Using `*` instead of naming each button class future-proofs the fix: any control added to `.sidebar-rail` or `.revisions-rail__header` later will automatically opt out.

A focused regression test (`tests/overlay-titlebar-drag-region.test.ts`) parses the CSS and asserts the new selectors and the original opt-outs are present, so the next refactor cannot silently remove the rules.

## Rule

When adding a new control that lives in the top 32px of the window (or any other band that intersects a `-webkit-app-region: drag` strip), add a matching `-webkit-app-region: no-drag` rule. The existing patterns to extend live in the single `no-drag` block in `src/styles/03-app-shell-layout.css`. Use `*` selectors when the host element is a header or rail so all current and future descendants stay clickable.
