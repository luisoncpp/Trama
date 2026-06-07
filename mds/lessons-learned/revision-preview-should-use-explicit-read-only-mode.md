# Revision preview should use explicit read-only mode

## What looked tempting

Treat Git revision preview like any other unavailable editor state: disable the editor and reuse the normal "no file/loading" affordances.

## What actually works better

Use an explicit preview mode with its own state (`previewReadOnly`, `previewValue`, `previewVersion`) and thread that mode through the editor, toolbar, find/replace UI, and native context menu.

## Why

- Preview still has a real document and real content, so the editor must stay mounted and render the revision.
- Equality-based external sync is not enough; selecting a revision may need a forced one-shot re-apply even when the visible text compares equal to a previous value.
- Disabled/unloaded states hide too much intent. Preview must remain navigable and copyable while blocking mutations.
- Mutation affordances live in multiple seams: toolbar save/revert, replace UI, markdown paste command, and Electron context menu cut/paste items.

## Apply this next time

When adding any temporary historical/compare/preview document mode, model it as a first-class editor state with dedicated UI rules instead of overloading generic disabled flags.
