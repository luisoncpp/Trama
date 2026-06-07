# Sidebar Path Scoping (Section-relative vs Project-relative)

## Date

2026-04-04

## Symptom

Rename/Delete/Create appear to work in UI, but backend actions target the wrong path or no-op.

## Root Cause

Sidebar tree rows are section-scoped (`book/`, `outline/`, `lore/` roots are stripped in some components), while repository and IPC operations require project-relative paths.

When actions are wired directly from section-level components to file operations without remapping, paths can drift.

## Correct Pattern

1. Keep section-local tree interactions section-scoped for UI simplicity.
2. Remap to project-relative paths in the panel composition layer before invoking editor actions.
3. Ensure context menu target path and selected path are consistent for rename/delete dialogs.

## Verification

- Validate right-click rename/delete in sidebar panel tests.
- Confirm callbacks receive expected project-relative path.
- Verify created/renamed/deleted file appears correctly after project refresh.

## Guardrails

- Treat path remapping as a dedicated concern in panel/body composition.
- Avoid duplicating remapping logic in multiple child components.
