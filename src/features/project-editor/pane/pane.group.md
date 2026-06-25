---
id: pane
label: Pane Shell
color: "#16a34a"
icon: layers
facades:
  - index.ts
  - pane-shared.ts
exclude:
  - pane-workspace.ts
  - pane-workspace-types.ts
  - pane-workspace-revision-state.ts
  - pane-workspace-private/**
descriptionShort: Split-pane rendering & editor hosts
---

Pane barrel, split rendering, editor panel shell, and navigation helpers. PaneWorkspace coordinator is a sibling group; map/relationships/rich editors nest as child groups.
