# Archivos a Refactorizar

Lista de archivos con errores de lint (`max-lines` y `max-lines-per-function`).

## Archivos con demasiadas líneas (`max-lines: 200`)

| # | Archivo | Líneas | Exceso |
|---|---------|--------|--------|
| 1 | `electron/services/book-export-pdf-renderer.ts` | 239 | +39 |
| 2 | `electron/services/document-repository.ts` | 210 | +10 |
| 3 | `src/features/project-editor/components/rich-markdown-editor-core.ts` | 202 | +2 |
| 4 | `src/features/project-editor/components/sidebar/sidebar-explorer-body.tsx` | 244 | +44 |
| 5 | `src/features/project-editor/components/sidebar/sidebar-tree.tsx` | 206 | +6 |
| 6 | `src/features/project-editor/use-project-editor-state.ts` | 202 | +2 |

## Funciones con demasiadas líneas (`max-lines-per-function: 50`)

| # | Archivo | Función | Líneas | Exceso |
|---|---------|---------|--------|--------|
| 1 | `electron/services/book-export-docx-renderer.ts` | `chapterParagraphs` | 72 | +22 |
| 2 | `src/features/project-editor/components/sidebar/sidebar-explorer-body.tsx` | `SidebarExplorerDialogs` | 62 | +12 |
| 3 | `src/features/project-editor/components/sidebar/sidebar-explorer-body.tsx` | `SidebarExplorerBody` | 59 | +9 |
| 4 | `src/features/project-editor/use-project-editor-folder-actions.ts` | `useProjectEditorFolderActions` | 73 | +23 |
| 5 | `src/features/project-editor/use-project-editor.ts` | `useProjectEditorEffects` | 64 | +14 |
| 6 | `src/features/project-editor/project-editor-view.tsx` | `buildSidebarSectionProps` | 51 | +1 |
| 7 | `src/features/project-editor/components/sidebar/sidebar-explorer-content.tsx` | `SidebarExplorerContent` | 54 | +4 |
| 8 | `src/features/project-editor/components/sidebar/sidebar-settings-content.tsx` | `SidebarSettingsContent` | 55 | +5 |

## Total: 14 problemas

- 6 archivos con exceso de líneas
- 8 funciones con exceso de líneas

## Orden sugerido para refactorizar

1. `use-project-editor-folder-actions.ts` (función más larga: 73 líneas)
2. `book-export-docx-renderer.ts` (72 líneas)
3. `use-project-editor.ts` (64 líneas)
4. `sidebar-explorer-body.tsx` (2 funciones + archivo)
5. `sidebar-explorer-content.tsx` (54 líneas)
6. `sidebar-settings-content.tsx` (55 líneas)
7. `project-editor-view.tsx` (51 líneas)
8. `book-export-pdf-renderer.ts` (239 líneas)
9. `document-repository.ts` (210 líneas)
10. `sidebar-tree.tsx` (206 líneas)
11. `rich-markdown-editor-core.ts` (202 líneas)
12. `use-project-editor-state.ts` (202 líneas)
