# Private directory makes the seam obvious

## Problem

Keeping private hook-assembly Modules beside public Modules made the project editor seam look wider than it really was. Files like `use-project-editor-state.ts` and `use-project-editor-actions.ts` looked reusable from anywhere in the feature area even when they only existed to support `useProjectEditor()`.

## Lesson

When one public Module owns a cluster of private hook/state assembly logic, put that Implementation in an explicitly private directory named after the public seam.

For the project editor, `project-editor-private/` makes three things obvious:

1. `use-project-editor.ts` is the public seam.
2. `project-editor-private/` is its private Implementation.
3. Deep Modules like `workspace-actions.ts`, `sidebar-file-actions/`, `conflict-actions.ts`, and `pane/` remain separate seams because they still earn their own depth.

## Why it helps

- **Locality:** seam-only implementation files are grouped in one place.
- **Leverage:** contributors can understand the public shape without scanning private assembly files.
- **Deletion test:** shallow builders and repacking Modules become easier to spot and remove instead of lingering as fake seams.

## When to apply

- A public hook or Module is the only intended importer of several helpers.
- The helpers mostly assemble state, actions, or effects for that one seam.
- Leaving them in the public directory would invite accidental imports.

## Date

2026-05-22
