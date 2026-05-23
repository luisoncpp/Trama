# sidebar shell width must be pinned

**Date:** 2026-05-23

## What I learned

When a sidebar shell has a user-configured width, setting only `width` is too weak if the shell sits inside a CSS grid/flex layout and its section content can have a larger intrinsic minimum size.

## The counter-intuitive part

The state can be perfectly stable and still look broken. In the sidebar rail case, switching between sections did not reset `panelWidth`; the rendered shell still changed size because a different section body could pressure the layout and grow the grid item beyond the stored width.

## Practical rule

For sidebar/container shells whose width is supposed to stay authoritative across content switches:

1. Compute one shell width value from state.
2. Apply it to `width`, `min-width`, and `max-width` on the shell.
3. Reuse the same effective collapsed state in both the shell and its parent grid column.
4. Treat section bodies as content that must fit inside that envelope, not redefine it.

## Why it matters here

- `sidebarPanelWidth` remains a true layout preference instead of a best-effort hint.
- Rail section switches (`explorer`, `outline`, `lore`, `transfer`, `settings`) no longer make the sidebar appear to resize.
- Responsive collapse can no longer leave the rail at `72px` while the parent grid still reserves expanded width.
- Future sidebar content additions can be reviewed against one explicit shell-width invariant.

## Focused verification

```bash
npm run test -- tests/sidebar-panels.test.ts
```
