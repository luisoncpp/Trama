---
topic: sidebar dialog portal vs test container
date: 2026-06-06
---

`SidebarFileActionsDialog` is rendered with `createPortal(..., document.body)` (added in commit `fbe0e8f` so the Edit Tags / rename / delete modal can overlay the full window for help-screenshot capture). Its siblings `SidebarCreateDialog` and `SidebarFolderActionsDialog` render inline in the sidebar.

In sidebar unit tests, queries for the portaled dialog elements must use `document.querySelector` / `document.querySelectorAll`, not the Preact test `container`. Inline-rendered elements (tree rows, context menus, folder dialog) stay on `container`. Mixing them up returns `null` and fails the test even though the dialog opens correctly.

When adding a new sidebar modal, decide portal vs inline first; if it needs full-window overlay (screenshot capture, stacking over the editor), query `document` in tests.
