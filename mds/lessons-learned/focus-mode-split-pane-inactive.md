# Focus Mode Split Pane: `isActive` Strict Equality

Date: 2026-04-20

## Context

Focus mode in split layout needs different behavior per pane:
- Active pane: full focus highlighting (sentence/line/paragraph)
- Inactive pane: uniform dimming of all content

The initial implementation used `!isActive` which treats `undefined` as falsy, causing editors without the prop to be treated as inactive.

## What worked

Use strict equality `isActive === false` for the inactive branch:

```typescript
if (!focusModeEnabled) {
    cleanupAllFocus(editorRoot)
    return
}

if (isActive === false) {
    cleanupInactiveEditor(editorRoot)
    return
}

// isActive is true or undefined → treat as active
editorRoot.classList.add('is-focus-mode')
```

The inactive pane gets `is-focus-mode-inactive` class with CSS:
```css
.rich-editor .ql-editor.is-focus-mode-inactive {
  opacity: 0.35;
}
```

## Why this works

- `undefined` is falsy but not `=== false`
- Editors rendered without `isActive` prop (backwards compatible single-pane) default to active behavior
- Strict check prevents silent regression in environments where prop isn't passed

## What failed

Using `!isActive` without strict equality caused:
- Editors without `isActive` prop to appear dimmed
- Focus highlighting never applied to "default" editors
- Tests caught the regression, but it was subtle in manual testing

## Test coverage

`tests/rich-markdown-editor-focus-split-pane.test.ts` covers:
- Active pane shows `is-focus-mode` + `is-focus-text-highlight`
- Inactive pane gets `is-focus-mode-inactive` (no highlight)
- Pane switch transfers focus correctly
- Strict equality behavior verified