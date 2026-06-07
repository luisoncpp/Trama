# Rich editor effect deps remount

Date: 2026-04-15

## Summary

A spellcheck toggle regression came from including `spellcheckEnabled` in the Quill initialization effect dependencies. Toggling spellcheck recreated the editor instance, leaving stale DOM references in tests and causing brittle runtime behavior.

## What happened

- `useInitializeEditor` was re-running when `spellcheckEnabled` changed.
- Quill got re-instantiated even though only a root attribute/property needed syncing.
- Tests asserting `.ql-editor` state after toggle observed the old node (`spellcheck="true"`) instead of the new instance.

## Fix

- Remove `spellcheckEnabled` from the editor-initialization effect dependency list.
- Keep spellcheck synchronization in the dedicated `useSyncSpellcheckEnabled` effect.

## Rule

Initialization effects for editor instances should depend only on identity/lifecycle inputs (for example `documentId`, refs). Dynamic runtime toggles (spellcheck, UI flags, etc.) must be handled in dedicated sync effects to avoid remount churn.

## Validation

- `tests/rich-markdown-editor.test.ts` passes including spellcheck sync assertion.
- Focused folder-delete regressions still pass after the change.
