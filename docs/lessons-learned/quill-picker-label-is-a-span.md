# Quill picker label is a span, not a button

Date: 2026-06-03

## Context

The rich editor uses a Quill `header` picker (`[{ header: [1, 2, 3, false] }]`) so users can switch between Normal, Heading 1, 2, 3. The window runs with the Win32 overlay titlebar (`html.has-overlay-titlebar`), so the toolbar carries `-webkit-app-region: drag` so users can drag the window from the toolbar.

## Symptom

Clicking the picker label does nothing. Keyboard focus does not move to the dropdown options. Switching heading levels from the toolbar is impossible — only the regular `button`/`select` toolbar controls (bold, italic, etc.) work.

Fullscreen mode works correctly.

## Root cause

Quill builds pickers from `<span>` elements, not `<button>` or `<select>`:

- `<span class="ql-picker">` container
- `<span class="ql-picker-label">` — the clickable label; `mousedown` toggles `ql-expanded`
- `<span class="ql-picker-options">` with `<span class="ql-picker-item">` children

The existing no-drag override for the toolbar only listed `button` and `select`:

```css
html.has-overlay-titlebar .rich-editor .ql-toolbar.ql-snow button,
html.has-overlay-titlebar .rich-editor .ql-toolbar.ql-snow select {
  -webkit-app-region: no-drag;
}
```

`-webkit-app-region` is not inherited, so the picker `<span>`s stay on the `drag` region. Chromium/Windows interprets the mousedown on the label as a window-drag gesture and never delivers the event to the page, so `togglePicker()` never runs.

Fullscreen works because the Win32 titlebar overlay disappears — the OS has nowhere to drag the window to, so the click passes through.

## Fix

Add the picker interactive elements to the no-drag list:

```css
html.has-overlay-titlebar .rich-editor .ql-toolbar.ql-snow button,
html.has-overlay-titlebar .rich-editor .ql-toolbar.ql-snow select,
html.has-overlay-titlebar .rich-editor .ql-toolbar.ql-snow .ql-picker-label,
html.has-overlay-titlebar .rich-editor .ql-toolbar.ql-snow .ql-picker-options,
html.has-overlay-titlebar .rich-editor .ql-toolbar.ql-snow .ql-picker-item {
  -webkit-app-region: no-drag;
}
```

## Rule

On Windows with an overlay titlebar, every interactive descendant inside a draggable toolbar needs `-webkit-app-region: no-drag`, not just the obvious `button`/`select`. Quill's `ql-picker` is the most common offender, but the same rule applies to any framework that builds toolbar controls from generic elements (`<a>`, `<span>`, `<div>` with `role="button"`, etc.). The "works in fullscreen" symptom is a quick way to identify drag-region issues from the user side.
