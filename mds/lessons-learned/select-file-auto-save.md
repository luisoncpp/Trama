# File Selection: Auto-save before navigation

## Context

File selection (`selectFile`) transitions between documents in the editor. When unsaved edits exist, the old guard pattern blocked all file changes with an error message. Clicking the same file would bypass this guard and reload from disk, losing local edits.

## Symptom

1. Edit file A without saving.
2. Try to select file B → blocked with "Save or wait" message.
3. Try to click file A again → file reloaded from disk, local edits lost.

## Root Cause

The guard function (`canSelectFile`) allowed same-file selections while dirty, but `selectFile` would still call `loadDocument`, unconditionally reloading from disk without preserving dirty content.

## Resolution

Changed `selectFile` to:
1. Always auto-save if dirty, regardless of target file.
2. Only reload from disk if navigating to a *different* file.
3. Skip reload if targeting the same file (preserves content after save).

This removes the blocking behavior and makes file selection safe by persisting edits first.

## Guardrail

File selection callbacks must always persist unsaved content before changing documents. Do not guard with "dirty check and block"; instead, auto-save and proceed.
