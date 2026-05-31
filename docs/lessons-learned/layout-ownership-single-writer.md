# Layout ownership should have one writer per dimension

When a layout dimension is written in more than one place, bugs usually show up as "visual shell says one size, parent allocator says another." The reliable pattern is to give each dimension one owner and make other layers consume that result.

For the project editor layout this means:

- sidebar width is allocated only by the `.editor-workspace` grid track via `--sidebar-width`
- `useSidebarLayout()` is the single place that combines persisted collapse state with responsive collapse
- focus-mode sidebar removal is CSS-only, with `display:none` paired to `grid-template-columns: 1fr`
- the editor height chain is named once as `.editor-fill-column` instead of re-derived from scattered flex rules
- JS and CSS share one "narrow" breakpoint (`900px`)

If a future fix needs the same layout number in two layers, prefer one explicit owner plus a named constant/comment over duplicated calculations.
