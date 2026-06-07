# Plan v2: Aislamiento del Módulo `pane/` (versión final corregida)

> **Objetivo:** `pane/` será el único módulo que conoce la mutación cruda de paneles. Los hooks de acciones y UI solo operarán contra `PaneWorkspace`.

> **Diferencia clave con v1:** El estado sigue viviendo en Preact (`useState`). `PaneWorkspace` no posee estado propio; encapsula mutaciones, flush y autosave. La inyección de setters se mueve a un factory/hook dentro de `pane/` para que el composition root tampoco conozca `setPrimaryPane` ni `setSecondaryPane`.

> **Corrección vs borrador:** `clearEditor` sigue siendo una acción compuesta de nivel app. `PaneWorkspace.clearPanes()` solo limpia los paneles; no absorbe reset de layout ni conflicto externo.

---

## 1. Principio de diseño

```
┌─────────────────────────────────────────────────────────────┐
│  FUERA del módulo pane (sidebar, dialogs, acciones, vista)  │
│                                                             │
│  Solo ven: PaneWorkspace (fachada opaca)                    │
│                                                             │
│  Métodos públicos:                                          │
│  - workspace.getActivePaneDocument()                        │
│  - workspace.getPaneDocument(pane)                          │
│  - workspace.isPaneDirty(pane?)                             │
│  - workspace.canSwitchAwayFrom(pane?)                       │
│  - workspace.savePaneIfDirty(pane)                          │
│  - workspace.saveAllDirtyPanes()                            │
│  - workspace.scheduleAutosave(pane, delay)                  │
│  - workspace.cancelAutosave()                               │
│  - workspace.destroy()                                      │
│  - workspace.updatePaneContent(pane, content)    ← NUEVO    │
│  - workspace.loadPaneDocument(pane, path, content, meta)    │
│  - workspace.clearPanes()                        ← NUEVO    │
│  - workspace.updatePaneMeta(path, meta)          ← NUEVO    │
│  - workspace.layout (Readonly)                              │
│  - workspace.primary (Readonly)                             │
│  - workspace.secondary (Readonly)                           │
│                                                             │
│  PROHIBIDO:                                                 │
│  - mutar paneles con setters crudos fuera de pane/          │
│  - acceder a serializationRefs directamente                 │
│  - llamar flush() fuera de PaneWorkspace                    │
└─────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│  DENTRO del módulo pane/                                    │
│                                                             │
│  - Recibe los setters de Preact vía paneBindings            │
│  - Es el ÚNICO que llama setPrimaryPane/setSecondaryPane    │
│  - Posee serializationRefs (inyectados en constructor)      │
│  - Posee el autosaveTimer                                   │
│  - Ejecuta flush() dentro de savePaneIfDirty()              │
│  - markPaneSaved() es privado, llamado tras save exitoso    │
│  - El estado real sigue en Preact (useState)                │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Factory hook dentro de `pane/`

Pasar setters crudos desde `use-project-editor.ts` al constructor deja una fuga: el composition root todavía conoce `setPrimaryPane` y `setSecondaryPane`. La solución es mover el wiring a un hook factory dentro de `pane/`.

```ts
// pane/use-pane-workspace.ts  (NUEVO, exportado del barrel)

interface PaneBindings {
  primaryPane: PaneDocumentState
  secondaryPane: PaneDocumentState
  setPrimaryPane: (value: PaneDocumentState | ((prev: PaneDocumentState) => PaneDocumentState)) => void
  setSecondaryPane: (value: PaneDocumentState | ((prev: PaneDocumentState) => PaneDocumentState)) => void
}

export function usePaneWorkspace(
  layoutState: WorkspaceLayoutState,
  paneBindings: PaneBindings,
  serializationRefs: {
    primary: { current: EditorSerializationRefs }
    secondary: { current: EditorSerializationRefs }
  },
  saveDocumentFn: (
    path: string, content: string, meta: DocumentMeta
  ) => Promise<void>,
): PaneWorkspace {
  return useMemo(
    () => new PaneWorkspace(layoutState, paneBindings, serializationRefs, saveDocumentFn),
    [layoutState, paneBindings, serializationRefs, saveDocumentFn],
  )
}
```

El viejo `use-pane-workspace.ts` en la raíz del feature (con stubs para tests) se **elimina**. Los tests se adaptan al nuevo factory.

### Barrel actualizado

```ts
// pane/index.ts
export {
  PaneWorkspace,
  usePaneWorkspace,           // ← NUEVO en barrel
  type WorkspacePane,
  type PaneDocumentInfo,
  type ActivePaneDocumentInfo,
} from './pane-workspace'
export { usePaneWorkspace } from './use-pane-workspace'
```

### Constructor de `PaneWorkspace`

```ts
class PaneWorkspace {
  private autosaveTimer: number | null = null

  constructor(
    private layoutState: WorkspaceLayoutState,
    private paneBindings: {
      primaryPane: PaneDocumentState
      secondaryPane: PaneDocumentState
      setPrimaryPane: (value: PaneDocumentState | ((prev: PaneDocumentState) => PaneDocumentState)) => void
      setSecondaryPane: (value: PaneDocumentState | ((prev: PaneDocumentState) => PaneDocumentState)) => void
    },
    private serializationRefs: {
      primary: { current: EditorSerializationRefs }
      secondary: { current: EditorSerializationRefs }
    },
    private saveDocumentFn: (       // firma SIN cambios: no recibe pane
      path: string, content: string, meta: DocumentMeta
    ) => Promise<void>,
  ) {}
}
```

---

## 3. Métodos de mutación (nuevos)

| Método | Visibilidad | Descripción | Reemplaza código en |
|--------|------------|-------------|---------------------|
| `updatePaneContent(pane, content)` | público | Actualiza contenido y marca dirty | `useEditorViewActions.updateEditorValue` |
| `loadPaneDocument(pane, path, content, meta)` | público | Carga un documento en un pane | `useLoadDocument` en `use-project-editor-actions.ts` |
| `clearPanes()` | público | Limpia ambos paneles (sin tocar layout) | `useClearEditor` (parte pane) |
| `updatePaneMeta(path, meta)` | público | Actualiza meta del pane con ese path | `useEditFileTagsAction` |
| `markPaneSaved(pane, path)` | **privado** | Limpia isDirty tras save exitoso | Se llama desde `savePaneIfDirty` |

### Implementación

```ts
updatePaneContent(pane: WorkspacePane, content: string): void {
  if (pane === 'secondary') {
    this.paneBindings.setSecondaryPane((prev) => ({ ...prev, content, isDirty: true }))
  } else {
    this.paneBindings.setPrimaryPane((prev) => ({ ...prev, content, isDirty: true }))
  }
}

loadPaneDocument(pane: WorkspacePane, path: string, content: string, meta: DocumentMeta): void {
  const doc: PaneDocumentState = { path, content, meta, isDirty: false }
  if (pane === 'secondary') {
    this.paneBindings.setSecondaryPane(doc)
  } else {
    this.paneBindings.setPrimaryPane(doc)
  }
}

clearPanes(): void {
  const emptyPane: PaneDocumentState = { path: null, content: '', meta: {}, isDirty: false }
  this.paneBindings.setPrimaryPane(emptyPane)
  this.paneBindings.setSecondaryPane(emptyPane)
}

updatePaneMeta(path: string, meta: DocumentMeta): void {
  this.paneBindings.setPrimaryPane((prev) => prev.path === path ? { ...prev, meta } : prev)
  this.paneBindings.setSecondaryPane((prev) => prev.path === path ? { ...prev, meta } : prev)
}

// PRIVADO: solo lo llama savePaneIfDirty tras save exitoso
private markPaneSaved(pane: WorkspacePane, path: string): void {
  if (pane === 'secondary') {
    this.paneBindings.setSecondaryPane((prev) => prev.path === path ? { ...prev, isDirty: false } : prev)
  } else {
    this.paneBindings.setPrimaryPane((prev) => prev.path === path ? { ...prev, isDirty: false } : prev)
  }
}
```

### `savePaneIfDirty` actualizado

```ts
async savePaneIfDirty(pane: WorkspacePane): Promise<void> {
  const paneDocument = pane === 'secondary' ? this.paneBindings.secondaryPane : this.paneBindings.primaryPane
  if (!paneDocument.isDirty || !paneDocument.path) return
  const flushResult = this.flushPane(pane)
  await executePaneSave(paneDocument, flushResult, this.saveDocumentFn)
  this.markPaneSaved(pane, paneDocument.path)  // limpia isDirty tras save exitoso
}
```

**Por qué `markPaneSaved` es privado:** hoy el único camino que guarda un pane es `savePaneIfDirty`. El callback `saveDocumentFn` solo hace IPC + estado global (saving flag, status). Limpiar `isDirty` es responsabilidad del módulo pane, no del callback externo. Esto además evita el bug donde `saveDocumentNow` iteraba ambos panes por path — ahora solo se limpia el pane que inició el save.

### `saveDocumentFn` NO cambia de firma

La firma inyectada sigue siendo `(path, content, meta) => Promise<void>`. No recibe `pane` porque `PaneWorkspace` ya sabe qué pane está guardando y llama `markPaneSaved` internamente. `useSaveDocumentNow` en `use-project-editor-actions.ts` mantiene su firma actual.

---

## 4. Métodos existentes (sin cambios)

| Método | Sigue igual |
|--------|-------------|
| `getActivePaneDocument()` | ✅ |
| `getPaneDocument(pane)` | ✅ |
| `isPaneDirty(pane?)` | ✅ |
| `canSwitchAwayFrom(pane?)` | ✅ |
| `saveAllDirtyPanes()` | ✅ |
| `scheduleAutosave(pane, delay)` | ✅ |
| `cancelAutosave()` | ✅ |
| `destroy()` | ✅ |
| `layout`, `primary`, `secondary` (getters frozen) | ✅ |

---

## 5. Cambios en cada consumer

### 5.1 `use-project-editor.ts`

```ts
// ANTES
const paneWorkspace = new PaneWorkspace(
  layoutState.workspaceLayout,
  paneState.primaryPane, paneState.secondaryPane,
  { primary: primarySerializationRef, secondary: secondarySerializationRef },
  (path, content, meta) => saveDocumentNowRef.current?.(...) ?? Promise.resolve(),
)
const { actions, core } = useProjectEditorActions({
  layoutState, paneState, projectState, uiState, sidebarState, setters, paneWorkspace,
})

// DESPUÉS
import { usePaneWorkspace } from './pane'

const paneBindings = {
  primaryPane: paneState.primaryPane,
  secondaryPane: paneState.secondaryPane,
  setPrimaryPane: setters.setPrimaryPane,
  setSecondaryPane: setters.setSecondaryPane,
}

const paneWorkspace = usePaneWorkspace(
  layoutState.workspaceLayout,
  paneBindings,
  { primary: primarySerializationRef, secondary: secondarySerializationRef },
  (path, content, meta) => saveDocumentNowRef.current?.(...) ?? Promise.resolve(),
)

const { actions, core } = useProjectEditorActions({
  layoutState, projectState, uiState, sidebarState, setters, paneWorkspace,
  // paneState YA NO se pasa
})
```

### 5.2 `use-project-editor-actions.ts`

| Cambio | Detalle |
|--------|---------|
| `UseProjectEditorActionsParams` | Quitar `paneState` |
| `useClearEditor` | `paneWorkspace.clearPanes()` + `setExternalConflictPath(null)` + `setConflictComparisonContent(null)` + reset de `workspaceLayout`. Quitar `setPrimaryPane`/`setSecondaryPane` |
| `useLoadDocument` | `paneWorkspace.loadPaneDocument(targetPane, response.data.path, markdownWithoutImages, response.data.meta)`. Quitar `setPrimaryPane`/`setSecondaryPane` |
| `useSaveDocumentNow` | **Sin cambios en firma.** Solo quitar `setPrimaryPane(...)` y `setSecondaryPane(...)` del body (ya lo hace `markPaneSaved` internamente). No recibe pane porque no lo necesita. |

### 5.3 `use-project-editor-ui-actions-helpers.ts`

| Función | Cambio |
|---------|--------|
| `useEditorViewActions.updateEditorValue` | `workspace.updatePaneContent(targetPane, nextValue)` en vez de `setPrimaryPane(...)` / `setSecondaryPane(...)` |
| `useEditorViewActions.saveNow` | Sin cambios (ya usa `workspace.savePaneIfDirty`) |
| Resto | Sin cambios |

### 5.4 `use-project-editor-file-actions.ts`

| Función | Cambio |
|---------|--------|
| `useEditFileTagsAction` | `workspace.updatePaneMeta(path, nextMeta)` en vez de `setPrimaryPane(...)` / `setSecondaryPane(...)` |
| Tipos | Quitar `setPrimaryPane` y `setSecondaryPane` de `UseProjectEditorFileActionsParams['setters']` |

### 5.5 `use-project-editor-layout-actions.ts`

Sin cambios. Ya usa `workspace.getPaneDocument()` y `workspace.savePaneIfDirty()`.

### 5.6 `use-project-editor-ui-actions.ts`

| Cambio | Detalle |
|--------|---------|
| `usePrimaryProjectEditorActions` | Quitar `paneState` del parámetro (ya no se usa) |
| `useSecondaryProjectEditorActions` | Sin cambios (sigue usando `deriveActivePaneDocument` vía `documentState`) |
| `useProjectEditorUiActions` | Quitar `paneState` y `layoutState` de parámetros extra (paneState ya no se usa, layoutState ya está en workspace) |

### 5.7 `use-project-editor-folder-actions.ts`

Limpiar `setPrimaryPane` y `setSecondaryPane` de los tipos de `setters` (no tienen uso real).

---

## 6. Cambios en el estado Preact

### 6.1 `use-project-editor-core-state.ts`

**Sin cambios.** `primaryPane`/`secondaryPane` siguen como `useState`.

### 6.2 `use-project-editor-state.ts`

| Cambio |
|--------|
| `ProjectEditorStateSetters` — quitar `setPrimaryPane` y `setSecondaryPane` |
| El objeto `setters` retornado **no incluye** `setPrimaryPane` ni `setSecondaryPane` |
| `paneState` (primaryPane + secondaryPane) se sigue exponiendo para que `use-project-editor.ts` construya `paneBindings` |
| `values` sigue incluyendo `primaryPane` y `secondaryPane` (consumidos por componentes del workspace para render) |

### 6.3 `use-project-editor-sub-state-hooks.ts`

**Sin cambios.**

---

## 7. Cambios en tipos

### 7.1 `project-editor-types.ts`

| Cambio |
|--------|
| `ProjectEditorStateSetters` — quitar `setPrimaryPane` y `setSecondaryPane` |

### 7.2 Parámetros de hooks

| Tipo | Cambio |
|------|--------|
| `UseProjectEditorActionsParams` | Quitar `paneState` |
| `UseProjectEditorUiActionsParams` | Quitar `paneState` y `layoutState` (ya están en workspace) |
| `UseProjectEditorFileActionsParams['setters']` | Quitar `setPrimaryPane`, `setSecondaryPane` |
| `UseProjectEditorFolderActionsParams['setters']` | Quitar `setPrimaryPane`, `setSecondaryPane` |

### 7.3 Qué NO cambia

- `saveDocumentFn` mantiene firma `(path, content, meta) => Promise<void>`
- `deriveActivePaneDocument` se sigue usando en `useDocumentState` y `buildValues` (no se toca en este paso)
- `CoreProjectEditorActions` no cambia

---

## 8. Estructura final

```
src/features/project-editor/pane/
├── index.ts                    ← barrel: PaneWorkspace + usePaneWorkspace + tipos públicos
├── use-pane-workspace.ts       ← factory/hook, encapsula setter injection, EXPORTADO del barrel
├── pane-workspace.ts           ← fachada: lectura + mutación + save + flush + autosave
└── pane-save-logic.ts          ← executePaneSave (interno, no en barrel)
```

**Archivo eliminado:** `src/features/project-editor/use-pane-workspace.ts` (viejo con stubs).

---

## 9. Archivos que cambian

| Archivo | Acción |
|---------|--------|
| `pane/pane-workspace.ts` | **EXTENDER** — +paneBindings en constructor, +5 métodos de mutación, markPaneSaved privado, savePaneIfDirty llama markPaneSaved |
| `pane/use-pane-workspace.ts` | **CREAR** — factory que encapsula inyección de setters, exportado del barrel |
| `pane/index.ts` | **ACTUALIZAR** — exportar usePaneWorkspace |
| `use-pane-workspace.ts` (raíz) | **ELIMINAR** |
| `use-project-editor.ts` | **MODIFICAR** — construir paneBindings, usar usePaneWorkspace, quitar paneState de useProjectEditorActions |
| `use-project-editor-actions.ts` | **MODIFICAR** — delegar en PaneWorkspace, quitar setPrimaryPane/setSecondaryPane |
| `use-project-editor-ui-actions-helpers.ts` | **MODIFICAR** — updateEditorValue usa workspace |
| `use-project-editor-ui-actions.ts` | **MODIFICAR** — quitar paneState de parámetros |
| `use-project-editor-file-actions.ts` | **MODIFICAR** — updatePaneMeta, limpiar tipos |
| `use-project-editor-folder-actions.ts` | **MODIFICAR** — limpiar tipos de setters |
| `use-project-editor-state.ts` | **MODIFICAR** — quitar setPrimaryPane/setSecondaryPane de setters públicos |
| `project-editor-types.ts` | **MODIFICAR** — quitar setPrimaryPane/setSecondaryPane de ProjectEditorStateSetters |
| `tests/pane-workspace.test.ts` | **EXTENDER** — tests para updatePaneContent, loadPaneDocument, clearPanes, updatePaneMeta, + verificar que savePaneIfDirty limpia isDirty |
| `tests/use-pane-workspace.test.ts` | **ACTUALIZAR** — adaptar al nuevo factory |

---

## 10. Beneficio neto

- **`pane/` concentra TODA mutación de pane.** Los hooks de acciones ya no llaman `setPrimaryPane` ni `setSecondaryPane`.
- **El composition root (`use-project-editor.ts`) tampoco los conoce** — solo construye `paneBindings` y llama `usePaneWorkspace`.
- **`markPaneSaved` es privado.** La limpieza post-save ocurre dentro del módulo, no en el callback IPC.
- **Sin cambios en `saveDocumentFn`** — la firma IPC sigue igual.
- **Sin problema de reactividad.** Preact funciona con `useState` normal. `PaneWorkspace` encapsula, no reemplaza.
- **Paso incremental verificable.** ~10 archivos modificados, 1 eliminado, 1 creado.

---

## 11. Verificación

### Tests automáticos

```
npm run test -- tests/pane-workspace.test.ts
npm run test -- tests/use-pane-workspace.test.ts
npm run test -- tests/use-project-editor.test.ts
npm run test -- tests/project-editor-conflict-flow.test.ts
npm run test -- tests/project-editor-logic.test.ts
```

### Chequeos manuales

1. **Split mode, editar secondary** → solo secondary queda dirty (primary limpio).
2. **Guardar desde botón de secondary** → solo secondary se limpia, primary intacto.
3. **Clear editor** → paneles vacíos Y además layout resetea a single/primary/nulls Y conflicto externo limpio.
4. **Abrir proyecto nuevo** → el editor carga sin errores, ambos paneles en estado inicial.
