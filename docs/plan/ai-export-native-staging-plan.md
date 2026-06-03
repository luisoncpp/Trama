# Implementation Plan: Native Explorer Picker & Staging Basket for AI Export

## Workstream Overview
Replaces the flat, cramped checkbox tree list inside the AI Export panel with an optimized dual-button allocation: **Add Files...** (`showOpenFilePicker`) and **Add Folder...** (`showDirectoryPicker`). Selected filesystem elements pass through immediate Relative Path Hardening inside the view controller, feeding a compact, high-density wrapped chip basket with full arrow-key and Backspace deletion accessibility.

---

## Phase 1: Property Threading & Contract Updates
- [x] **Prop Injections (`ai-export-dialog.tsx`):**
  - Thread `projectRoot` from the screen router layer down to the rendering boundaries.
  - Expose `setLastError` and `setCopyToastMessage` channels to trigger unified feedback parameters simultaneously.

## Phase 2: Interface Rebuilding (`ai-export-dialog-body.tsx`)
- [x] **Action Row Composition:**
  - Remove the legacy `Select all` checkbox header.
  - Mount side-by-side secondary full-sized action targets: **Add Files...** and **Add Folder...**.
  - Provide a text link or compact affordance button for **Clear Basket**.
- [x] **Staging Basket Track:**
  - Build an inset container layout structured with a subtle dark background panel.
  - Map selected relative file paths into wrapping tag chips displaying the short filename, caching the full relative location as an explicit hover tooltip hint.
  - Add single-tap dismiss buttons (`×`) to discard a selected file handle instantly.

## Phase 3: Relative Path Hardening
- [x] **Absolute Prefix Verification:**
  - Implement forward-slash path normalization across incoming operating system descriptors.
  - Enforce that absolute selection boundaries start with the active `projectRoot`.
  - Slice off parent prefixes to capture pure relative strings.
- [x] **Asset Branch Filtering:**
  - Discard unmanaged files or dot-folders, ensuring only items inside `book/`, `lore/`, or `outline/` populate the basket.
  - Report skipped elements or duplicates to the active toast and error logs synchronously.

## Phase 4: Keyboard Accessibility & Verification
- [x] **Basket Focus Controls:**
  - Bind arrow-key keydown handlers inside the chip list track to shift visual element focus inline.
  - Intercept `Backspace` or `Delete` parameters to safely purge tokens and transition context focus smoothly to adjacent row neighbors.
- [x] **Automated Integration Checks:**
  - Execute full compilation and test validations (`npm run test`) to assert zero regression leaks across the project feature tree.

## Focused regression commands

```bash
npm run test -- tests/ai-export-staging-hardening.test.ts tests/ai-export-staging-keyboard.test.ts tests/use-ai-export.test.ts tests/project-editor-view-render-split.test.ts
```
