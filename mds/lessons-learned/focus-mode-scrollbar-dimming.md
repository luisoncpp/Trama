# Focus mode scrollbar dimming

## Problem

In focus mode, editor text is dimmed (14-24% opacity) but the scrollbar remains at full opacity, standing out visually against the muted content.

## Solution

Target the editor's `.ql-container.ql-snow` scrollbar with CSS pseudo-elements:

```css
.editor-shell.is-focus-mode .rich-editor .ql-container.ql-snow::-webkit-scrollbar-thumb {
  background-color: color-mix(in oklab, var(--border-strong) 45%, transparent);
}
.editor-shell.is-focus-mode .rich-editor .ql-container.ql-snow {
  scrollbar-color: color-mix(in oklab, var(--border-strong) 45%, transparent) transparent;
}
```

## Notes

- Always provide both `::-webkit-scrollbar-*` (Chromium) and `scrollbar-color` (Firefox) for cross-browser coverage.
- `opacity` on `::-webkit-scrollbar-thumb` is not supported; use `color-mix()` or `rgba()` instead.
- Also add a non-focus base scrollbar style so the transition is smooth, not jarring.
