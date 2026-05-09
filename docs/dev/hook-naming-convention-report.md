# Hook Naming Convention Violations — Pending

> Discovered during conversation (Apr 26, 2026). These files have `useEffect` or `useCallback` hooks **without** the required `/*Inputs for effectName*/` comment after the dependency array.
>
> See `docs/dev-workflow.md` for the Hook Naming Convention rule.

## Rule summary

Every `useEffect` and `useCallback` must have a trailing comment of the form:

```typescript
// ✅ Correct
useEffect(() => { ... }, [dep1, dep2] /*Inputs for effectName*/)
useCallback(async (...) => { ... }, [deps] /*Inputs for callbackName*/)

// ❌ Missing
useEffect(() => { ... }, [dep1, dep2])
useCallback(async (...) => { ... }, [deps])
```

---

## Missing naming comments (18 files, 21 hooks)

### 1. `src/features/project-editor/components/rich-markdown-editor-toolbar.ts` (1 hook)
- **Line 191** — `useSyncToolbarControls` effect
  ```typescript
  }, [documentId, editorRef, hostRef, onSaveNow, saveDisabled, saveLabel, syncState, syncStateLabel])
  ```
  → needs `/*Inputs for syncToolbarControls*/`

### 2. `src/features/project-editor/use-project-editor-shortcuts-effect.ts` (1 hook)
- **Line 75** — `useProjectEditorShortcutsEffect` effect
  ```typescript
  }, [onSaveNow, onSwitchActivePane, onToggleFocusMode, onToggleFullscreen, onToggleSplitLayout, onEscapePressed])
  ```
  → needs `/*Inputs for registerKeyboardShortcuts*/`

### 3. `src/features/project-editor/components/rich-markdown-editor-find-visual.ts` (1 hook)
- **Line 121** — `useActiveMatchOverlayEffect` effect
  ```typescript
  }, [editorRef, hostRef, isOpen, keepFindFocus, state.activeMatch, state.matches, state.query])
  ```
  → needs `/*Inputs for scrollToActiveMatch*/`

### 4. `src/features/project-editor/components/rich-markdown-editor-focus-scope.ts` (1 hook)
- **Line ~136** — effect inside `useFocusModeScopeEffect`
  ```typescript
  }, [editorRef, hostRef, focusModeEnabled, focusScope, isActive])
  ```
  → needs `/*Inputs for applyFocusModeScope*/`

### 5. `src/features/project-editor/components/sidebar/use-sidebar-tree-expanded-folders.ts` (3 hooks)
- **Line 84** — `useSeedExpandedFolders` effect
  ```typescript
  }, [didInitializeRef, previousTreeKeyRef, setExpandedFolders, tree])
  ```
  → needs `/*Inputs for seedExpandedFolders*/`

- **Line 104** — `useExpandSelectedPathAncestors` effect
  ```typescript
  }, [selectedPath, setExpandedFolders, tree])
  ```
  → needs `/*Inputs for expandSelectedPathAncestors*/`

- **Line 147** — effect for filter/restore cycle
  ```typescript
  }, [expandedFolders, filterQuery, tree])
  ```
  → needs `/*Inputs for syncFilterExpandedFolders*/`

### 6. `src/features/project-editor/use-sidebar-ui-state.ts` (1 hook)
- **Line ~78** — effect persisting sidebar UI state
  ```typescript
  }, [activeSection, panelCollapsed, panelWidth])
  ```
  → needs `/*Inputs for persistSidebarUiState*/`

### 7. `src/features/project-editor/use-tag-index.ts` (3 hooks)
- **Line 66** — effect on `rootPath` change
  ```typescript
  }, [rootPath, fetchTagIndexCallback])
  ```
  → needs `/*Inputs for loadTagIndex*/`

- **Line 72** — effect subscribing to external file events
  ```typescript
  }, [fetchTagIndexCallback])
  ```
  → needs `/*Inputs for subscribeToExternalFileEvents*/`

- **Line ~80** — effect for tag index refresh
  ```typescript
  (effect body around line 75)
  ```
  → needs `/*Inputs for refreshTagIndex*/`

### 8. `src/features/project-editor/components/rich-markdown-editor-ctrl-key.ts` (1 hook)
- **Line 32** — `useCtrlKeyState` effect
  ```typescript
  }, [])
  ```
  → needs `/*Inputs for trackCtrlKeyState*/`

### 9. `src/features/project-editor/use-project-editor-external-events-effect.ts` (1 hook)
- **Line ~128** — effect subscribing to external file events
  ```typescript
  }, [clearEditor, isDirty, loadDocument, openProject, selectedPath, setExternalConflictPath, setConflictComparisonContent, setStatusMessage, snapshotRootPath])
  ```
  → needs `/*Inputs for handleExternalFileEvents*/`

### 10. `src/features/project-editor/use-project-editor-context-menu-effect.ts` (1 hook)
- **Line 67** — `useProjectEditorContextMenuEffect` effect
  ```typescript
  }, [isFullscreen, setFocusScope, setFullscreenEnabled, setWorkspaceLayoutRatio, toggleFocusMode, toggleWorkspaceLayoutMode])
  ```
  → needs `/*Inputs for handleContextMenuCommands*/`

### 11. `src/features/project-editor/use-project-editor-fullscreen-effect.ts` (1 hook)
- **Line 22** — `useProjectEditorFullscreenEffect` effect
  ```typescript
  }, [setIsFullscreen])
  ```
  → needs `/*Inputs for syncFullscreenState*/`

### 12. `src/features/project-editor/use-workspace-layout-state.ts` (1 hook)
- **Line 28** — effect persisting workspace layout state
  ```typescript
  }, [workspaceLayout])
  ```
  → needs `/*Inputs for persistWorkspaceLayout*/`

### 13. `src/features/project-editor/components/sidebar/use-sidebar-filter-shortcut.ts` (1 hook)
- **Line 25** — `useSidebarFilterShortcut` effect
  ```typescript
  }, [enabled, focusFilterInput])
  ```
  → needs `/*Inputs for registerFilterShortcut*/`

### 14. `src/features/project-editor/components/sidebar/use-sidebar-responsive-collapse.ts` (1 hook)
- **Line 21** — `useSidebarResponsiveCollapse` effect
  ```typescript
  }, [])
  ```
  → needs `/*Inputs for trackViewportWidth*/`

### 15. `src/features/project-editor/components/sidebar/sidebar-filter.tsx` (2 hooks)
- **Line 16** — effect syncing draft value with prop
  ```typescript
  }, [value])
  ```
  → needs `/*Inputs for syncDraftValue*/`

- **Line 26** — effect debouncing onChange
  ```typescript
  }, [debounceMs, draftValue, onChange])
  ```
  → needs `/*Inputs for debounceOnChange*/`

---

## Already compliant (this session)

The following files were updated in this conversation and already have correct naming comments:

- `src/features/project-editor/components/rich-markdown-editor-core.ts` — 4 useEffects
- `src/features/project-editor/components/rich-markdown-editor.tsx` — 2 useEffects
- `src/features/project-editor/use-project-editor.ts` — 1 useEffect
- `src/features/project-editor/use-project-editor-autosave-effect.ts` — 1 useEffect
- `src/features/project-editor/use-project-editor-close-effect.ts` — 2 useEffects
- `src/features/project-editor/use-project-editor-ui-actions-helpers.ts` — 3 useCallbacks
- `src/features/project-editor/use-project-editor-layout-actions.ts` — 6 useCallbacks
- `src/features/project-editor/use-project-editor-actions.ts` — 3 useCallbacks
- `src/features/project-editor/components/rich-markdown-editor-lifecycle-hooks.ts` — 3 useEffects (fixed this session)

---

## Total

| Category | Count |
|----------|-------|
| Hooks missing naming comment | 20 |
| Files affected | 17 |
| Already compliant (project-editor) | ~24 hooks across 9 files |
