# Folder Rename Split Layout + Sidebar Expansion Remap

## Date

2026-04-15

## Symptom

Folder rename worked on disk, but split-pane reopen could lose one pane target and sidebar expansion state could collapse unexpectedly after refresh.

## Root Cause

- Reopen flow depended on current layout paths; folder rename changed path prefixes for potentially both pane targets.
- Expanded-folder state in sidebar was path-based and did not know old->new prefix mapping.

## Correct Pattern

1. Remap both `workspaceLayout.primaryPath` and `workspaceLayout.secondaryPath` with old/new folder prefix before reopen.
2. Reopen project with remapped active-pane preferred path.
3. Emit one-shot folder rename event and consume it inside expanded-folder hook to remap expansion paths before invalid-path pruning.

## Verification

- Rename folder containing both open split-pane files and verify both panes keep mapped documents.
- Rename expanded folder and verify subtree stays expanded after refresh.

## Guardrails

- Keep subtree dirty guard before folder rename in V1 to avoid path invalidation over unsaved edits.
- Keep remap logic in pure helpers (`project-editor-folder-logic.ts`) for deterministic tests.
