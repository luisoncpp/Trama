# Consolidación de PanePersistence en PaneWorkspace

> **Objetivo:** `PaneWorkspace` será el único punto de acceso a todo lo relacionado con paneles. Nada fuera de `pane/` toca estado de pane, flush, save, o autosave directamente.

---

## 1. Estructura final

```
src/features/project-editor/
├── pane/                          ← carpeta nueva, módulo privado
│   ├── index.ts                   ← barrel: SOLO PaneWorkspace + tipos públicos
│   ├── pane-workspace.ts          ← fachada: lectura + save + flush + autosave + destroy
│   └── pane-save-logic.ts         ← executePaneSave (INTERNO, no exportado en barrel)
│
├── project-editor-logic.ts        ← deriveActivePaneDocument se queda aquí
│                                     (la capa de estado lo usa para alimentar a PaneWorkspace)
├── use-project-editor.ts          ← orquestador, crea y usa PaneWorkspace
├── use-project-editor-state.ts    ← capa de estado Preact (no se toca el estado)
├── use-project-editor-autosave-effect.ts
├── use-project-editor-close-effect.ts
├── use-project-editor-ui-actions-helpers.ts
├── use-project-editor-ui-actions.ts
├── use-project-editor-layout-actions.ts
├── components/
├── sidebar/
├── tests/
└── ...
```

---

## 2. Constructor actualizado de `PaneWorkspace`

```ts
class PaneWorkspace {
  private autosaveTimer: number | null = null

  constructor(
    private layoutState: WorkspaceLayoutState,
    private primaryPane: PaneDocumentState,
    private secondaryPane: PaneDocumentState,
    private serializationRefs: {           // antes en PanePersistence
      primary: { current: EditorSerializationRefs }
      secondary: { current: EditorSerializationRefs }
    },
    private saveDocumentFn: (              // antes en PanePersistence
      path: string, content: string, meta: DocumentMeta
    ) => Promise<void>,
  ) {}
```

---

## 3. Métodos que absorbe de `PanePersistence`

| Método actual en `PanePersistence` | Queda en `PaneWorkspace` |
|-------------------------------------|--------------------------|
| `getSerializationRefForPane(pane)` | → privado, usado por `flushPane` |
| `getPaneStateForPane(pane)` | → `getPaneDocument(pane)` (ya existe) |
| `flushPane(pane)` | → **método privado** |
| `savePaneIfDirty(pane)` | → **nuevo método público** |
| `saveAllDirtyPanes()` | → **nuevo método público** |

### `scheduleAutosave` simplificado

```ts
scheduleAutosave(pane: WorkspacePane, delay: number): void {
  this.cancelAutosave()
  const capturedPane = pane
  this.autosaveTimer = window.setTimeout(() => {
    this.autosaveTimer = null
    if (this.layoutState.activePane === capturedPane) {
      void this.savePaneIfDirty(capturedPane)
    }
  }, delay)
}
```

---

## 4. Qué simplifica en cada consumer

### `useProjectEditorAutosaveEffect`

```ts
// ANTES: recibe panePersistence + paneWorkspace
paneWorkspace.scheduleAutosave(activePane, () => panePersistence.savePaneIfDirty(activePane), delay)

// DESPUÉS: solo recibe paneWorkspace
paneWorkspace.scheduleAutosave(activePane, delay)
```

### `useProjectEditorCloseEffect`

```ts
// ANTES: recibe paneState + panePersistence
const hasUnsaved = paneState.primaryPane.isDirty || paneState.secondaryPane.isDirty
w.__tramaSaveAll = async () => { await panePersistence.saveAllDirtyPanes() }

// DESPUÉS: recibe paneWorkspace
const hasUnsaved = paneWorkspace.isPaneDirty('primary') || paneWorkspace.isPaneDirty('secondary')
w.__tramaSaveAll = async () => { await paneWorkspace.saveAllDirtyPanes() }
```

### `useSelectFileAction`

```ts
// ANTES
{ workspace, panePersistence, loadDocument, assignFileToActivePane }
panePersistence.getPaneStateForPane(activePane)
await panePersistence.savePaneIfDirty(activePane)

// DESPUÉS
{ workspace, loadDocument, assignFileToActivePane }
workspace.getPaneDocument(activePane)
await workspace.savePaneIfDirty(activePane)
```

### `useSetWorkspaceActivePaneAction`

```ts
// ANTES
{ workspace, panePersistence, setters, loadDocument }
const outgoingState = panePersistence.getPaneStateForPane(outgoingPane)
await panePersistence.savePaneIfDirty(outgoingPane)

// DESPUÉS
{ workspace, setters, loadDocument }
const outgoingState = workspace.getPaneDocument(outgoingPane)
await workspace.savePaneIfDirty(outgoingPane)
```

### `useEditorViewActions.saveNow`

```ts
// ANTES
const paneStateLocal = panePersistence.getPaneStateForPane(targetPane)
void panePersistence.savePaneIfDirty(targetPane)

// DESPUÉS
void workspace.savePaneIfDirty(targetPane)
```

### `useProjectEditorUiActions`

```ts
// ANTES
useProjectEditorUiActions({ layoutState, paneState, ..., panePersistence })

// DESPUÉS: ya no pasa panePersistence
useProjectEditorUiActions({ layoutState, paneState, ... })
```

---

## 5. Archivos que cambian

| Archivo | Acción |
|---------|--------|
| `pane/index.ts` | **CREAR** — barrel, exporta `PaneWorkspace`, `PaneDocumentInfo`, `ActivePaneDocumentInfo`, `WorkspacePane` |
| `pane/pane-workspace.ts` | **MOVER** desde raíz, + `savePaneIfDirty`, `saveAllDirtyPanes`, `flushPane` privado, `scheduleAutosave` simplificado |
| `pane/pane-save-logic.ts` | **MOVER** desde raíz, sin cambios, NO exportado en barrel |
| `use-project-editor-pane-persistence.ts` | **ELIMINAR** |
| `use-project-editor.ts` | Pasar `serializationRefs` + `saveDocumentNow` al constructor de `PaneWorkspace`; eliminar `useProjectEditorPanePersistence` |
| `use-project-editor-autosave-effect.ts` | Quitar `panePersistence`, solo recibe `paneWorkspace` |
| `use-project-editor-close-effect.ts` | Quitar `paneState` + `panePersistence`, usar `paneWorkspace` |
| `use-project-editor-ui-actions-helpers.ts` | `saveNow`, `selectFile`, `moveFile`, layout actions usan `workspace` en vez de `panePersistence` |
| `use-project-editor-ui-actions.ts` | Dejar de pasar `panePersistence` a helpers |
| `use-project-editor-layout-actions.ts` | `setWorkspaceActivePane` usa `workspace` en vez de `panePersistence` |
| `tests/pane-workspace.test.ts` | Tests para `savePaneIfDirty`, `saveAllDirtyPanes`, `scheduleAutosave` simplificado, `flushPane` |
| `tests/project-editor-logic.test.ts` | Actualizar import path de `executePaneSave` |

---

## 6. Beneficio neto

- **`PaneWorkspace` pasa de fachada de solo-lectura a fachada completa** (lectura + save + flush + autosave + destroy)
- **`pane/` folder** deja claro: todo adentro es privado, solo se accede por `import { PaneWorkspace } from './pane'`
- **Se elimina un hook entero** (`useProjectEditorPanePersistence`)
- **Menos props en cada action hook** (todos quitan `panePersistence`)
- **Menos imports** en cada consumer
- **`scheduleAutosave` ya no recibe callback** — la política de save vive dentro del módulo pane