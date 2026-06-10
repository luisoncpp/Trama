# Quill Clipboard Matchers Must Return the Delta Parameter for Unmatched Nodes

Date: 2026-06-10

## Symptom

Pasting content copied from other applications (like web browsers, IDEs, or Microsoft Word) sometimes fails completely or strips text and formatting in the Quill editor. However, copying and pasting plain text from notepad or simple sources inside the app works fine.

## Why it happened

Quill clipboard matchers registered via `addMatcher` are executed when pasting HTML. The signature of the matcher callback is `(node, delta) => Delta`, where the second parameter `delta` contains the pre-compiled Quill Delta for that node and its children.

Our custom `div` matcher was defined as:
```typescript
editor.clipboard.addMatcher('div', (node) => {
  if (!(node instanceof Element)) {
    return new Delta()
  }
  const value = parseDirectiveFromNode(node)
  if (!value) {
    return new Delta()
  }
  return new Delta().insert({ [LAYOUT_DIRECTIVE_BLOT_NAME]: value })
})
```

Because it ignored the second `delta` argument and returned `new Delta()` (an empty Delta) when the element was not a layout directive, it completely discarded/stripped the contents of any normal `div` elements pasted into the editor. Since rich content from external applications is heavily wrapped in `div`s, this caused pasted text to disappear.

## What to do next time

1. When writing custom Quill clipboard matchers, always accept the second parameter (`delta`).
2. If the node does not match the target criteria (e.g., it is a normal element rather than a custom directive), return the passed-in `delta` to preserve default parsing rather than returning `new Delta()`.
