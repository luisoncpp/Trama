# Project Folder Required Structure

## Context

When users selected arbitrary folders, project operations later failed or behaved inconsistently because expected top-level folders (`book`, `lore`, `outline`) were missing.

## Lesson

Validate project structure at folder-pick time, not later in editor flows.

## What worked

- Detect missing folders immediately after folder selection.
- Show explicit choice: create missing folders, pick another folder, or cancel.
- If user rejects auto-create, reopen folder picker loop instead of continuing with invalid root.

## Why it matters

Early guard keeps project state predictable and avoids delayed runtime errors in create/open flows.
