# Focus mode caret must not inherit dimmed text color

## Symptom

With focus mode on (especially `line` / `sentence` scopes), the text insertion caret looked faint and was hard to spot.

## Cause

Scope dimming lowers text contrast with `color: color-mix(in oklab, var(--canvas-ink) 14%, transparent)` on block children. The caret uses the same computed `color` unless overridden.

## Fix

On the active editor only (`.ql-editor.is-focus-mode`, not `.is-focus-mode-inactive`):

```css
caret-color: var(--canvas-ink);
```

Defined in `src/styles/09-quill-theme-overrides.css` next to the other focus-mode editor rules.
