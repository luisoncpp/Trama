# Stable context facade prevents Preact consumer rerenders

When a Preact context exposes a fresh object every render, all consumers rerender even if the only thing they need is an event handler. This is especially expensive for action surfaces like `ProjectEditorActions`, which are often rebuilt whenever editor state changes.

Effective pattern:

1. Store the latest action set in a ref during Provider render.
2. Build the context value once.
3. Make each exposed method delegate to `ref.current`.

This keeps the context value identity stable, avoids context-driven rerender fan-out, and still gives leaves fresh actions when events fire.

In Trama, this pattern is now the required shape for `EditorActionsProvider` in `src/features/project-editor/project-editor-actions-context.tsx`.
