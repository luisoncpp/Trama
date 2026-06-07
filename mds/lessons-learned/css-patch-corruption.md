# CSS Patch Tool: Risk of Injecting Blocks Inside Existing Rules

**Date:** 2026-04-04

## Problem

When using the patch/replace tool to add new CSS rules to `src/index.css`, the tool sometimes injects the new rule block _inside_ an already-open rule block rather than between rules. The result is malformed CSS like:

```css
:root {
  --some-var: value;

  /* NEW RULE INJECTED HERE — INSIDE :root */
  .sidebar-tree__row {
    font-family: sans-serif;
  }
}

body {
  /* ANOTHER RULE INJECTED MID-SELECTOR */
  .sidebar-tree__chevron { ... }
  margin: 0;
}
```

This causes: build failure (`postcss`/`vite` CSS parse errors) or silently incorrect styles that only apply in specific selector contexts.

## Root Cause

The patch tool uses string matching to find the insertion point. If the anchor string (e.g., `}`) appears inside an open block, the match can land at the wrong closing brace, injecting code into the middle of the parent rule.

## Prevention

1. **Use large, unambiguous anchors.** Include several lines of context before and after the target location in the `oldString`, making the match unique.
2. **Apply CSS changes in small, isolated hunks.** Do not batch multiple new rule additions in a single patch.
3. **Validate structure after each edit.** After every CSS patch, check that the new rules are at the correct nesting level (top-level, not inside `:root` or `body`).
4. **Prefer appending to end of file** for purely additive changes — it avoids injection position errors entirely.

## Recovery

If corruption is detected, use `replace_string_in_file` with exact multiline `oldString` matching the corrupted block to remove the misplaced rules, then re-insert them at the correct location.

## Affected file

`src/index.css` — this file has a `:root {}` CSS custom properties block at the top followed by `body {}`. Both are common injection victims.
