# Shared Sentinel for Section-Root Scope

**Date:** 2026-04-30

**What:** `scopeCorkboardOrder()` and `sortTreeRowsByOrder()` both use an implicit empty string `''` as the sentinel for the root folder (section root) in scoped paths. `scopeCorkboardOrder` converts the root key (e.g., `book`) to `''`, and `sortTreeRowsByOrder` checks `folderKey === ''` to detect root-level files. If someone changes only one of these, the other silently breaks — file ordering just stops working with no errors.

**Why counter-intuitive:** Two files were coupled through a magic string literal with no named constant. Any refactor of the sentinel in one file but not the other produces silent data corruption (wrong sort order) rather than a compile error or runtime exception.

**Solution:** Export `SCOPED_ROOT_KEY = ''` from `sidebar-panel-logic.ts` and use it in both `scopeCorkboardOrder()` (sidebar-panel-body.tsx) and `sortTreeRowsByOrder()` (sidebar-tree-sort.ts). Now a rename triggers compiler/IDE warnings across both call sites.

**Files involved:**
- `src/features/project-editor/components/sidebar/sidebar-panel-logic.ts` — defines `SCOPED_ROOT_KEY`
- `src/features/project-editor/components/sidebar/sidebar-panel-body.tsx` — `scopeCorkboardOrder()` uses it for the root-key conversion
- `src/features/project-editor/components/sidebar/sidebar-tree-sort.ts` — `sortTreeRowsByOrder()` uses it for the root sentinel check