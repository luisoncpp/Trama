# Quill default Backspace/Delete handlers only lose to init-time bindings

Date: 2026-05-14

## What to know

If you need to override Quill behavior for `Backspace` or `Delete`, adding handlers later with `quill.keyboard.addBinding()` is not enough.

Quill's default handlers are already registered during editor initialization and run first.

## Why this matters

For seam-safe center-boundary deletion, a post-init binding looked correct in isolated helper tests, but the live editor still deleted `center:end` because Quill's built-in delete handler fired before the custom one.

## Effective rule

Put special-case keyboard overrides in the Quill constructor config:

```ts
modules: {
  keyboard: {
    bindings: createLayoutDirectiveKeyboardBindings(),
  },
}
```

Use `addBinding()` only for behavior that does not need to preempt Quill defaults.

## Where this applied

- `src/features/project-editor/pane/rich-markdown-editor/rich-markdown-editor-quill.ts`
- `src/features/project-editor/pane/rich-markdown-editor/rich-markdown-editor-layout-keyboard.ts`
- `tests/rich-markdown-editor.test.ts`

## Reference

- Quill keyboard docs: `https://quilljs.com/docs/modules/keyboard/`
