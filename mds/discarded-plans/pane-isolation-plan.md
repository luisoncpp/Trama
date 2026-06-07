# Plan: Aislamiento Completo del Módulo `pane/`

> **Objetivo:** `src/features/project-editor/pane/` será el único módulo que posee, muta y lee el estado de los paneles del editor. Nada fuera de esa carpeta toca `primaryPane`, `secondaryPane`, `serializationRefs`, `flush`, `save` o `isDirty` directamente.

---

## 1. Estado actual (post-consolidación)

El paso anterior (`pane-persistence-consolidation.md`) consolidó `PanePersistence` en `PaneWorkspace` y creó la carpeta `pane/`. Sin embargo, el estado de los paneles sigue viviendo **fuera** del módulo:

- `use-project-editor-core-state.ts` crea `primaryPane` y `secondaryPane` como `useState<PaneDocumentState>()`.
- `use-project-editor-state.ts` los expone como `paneState.primaryPane` / `paneState.secondaryPane` a toda la aplicación.
- Los hooks de acciones mutan paneles directamente via `setPrimaryPane()` / `setSecondaryPane()`.
- `PaneWorkspace` recibe una copia estática del estado en su constructor, pero no es el dueño.
- `serializationRefs` se crean en `use-project-editor.ts` y se pasan al constructor.

Esto significa que cualquier hook puede saltarse la fachada y mutar el estado crudo.

---

## 2. Principio de diseño

```
┌─────────────────────────────────────────────────────────────┐
│  FUERA del workspace (sidebar, dialogs, acciones globales)  │
│                                                             │
│  Solo ven: PaneWorkspace (fachada opaca)                    │
│                                                             │
│  Métodos permitidos:                                        │
│  - workspace.getActivePaneDocument()                        │
│  - workspace.getPaneDocument(pane)                          │
│  - workspace.isPaneDirty(pane?)                             │
│  - workspace.canSwitchAwayFrom(pane?)                       │
│  - workspace.canSwitchToFile(filePath)                      │
│  - workspace.isPathOpenAndDirty(path)                       │
│  - workspace.hasDirtyPathInsideFolder(folderPath)           │
│  - workspace.savePaneIfDirty(pane)                          │
│  - workspace.saveAllDirtyPanes()                            │
│  - workspace.scheduleAutosave(pane, delay)                  │
│  - workspace.loadPaneDocument(pane, path, content, meta)    │
│  - workspace.updatePaneContent(pane, content)               │
│  - workspace.updatePaneMeta(path, meta)                     │
│  - workspace.markPaneSaved(path)                            │
│  - workspace.clearPanes()                                   │
│  - workspace.layout (readonly)                              │
│                                                             │
│  PROHIBIDO tocar:                                           │
│  - primaryPane / secondaryPane directamente                 │
│  - setPrimaryPane / setSecondaryPane                        │
│  - serializationRefs                                        │
│  - flush() directamente                                     │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  DENTRO del workspace (pane/)                               │
│                                                             │
│  - Posee el estado: primaryPane, secondaryPane              │
│  - Posee los serializationRefs                              │
│  - Posee el autosaveTimer                                   │
│  - Es el único que puede mutar el estado de paneles         │
│  - Es el único que puede llamar flush() en los refs         │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Cambios en `PaneWorkspace`

### 3.1 Estado interno

```ts
class PaneWorkspace {
  private primaryPane: PaneDocumentState
  private secondaryPane: PaneDocumentState
  private autosaveTimer: number | null = null

  // Estos refs ahora los crea y posee PaneWorkspace, no se reciben del exterior
  private serializationRefs = {
    primary: { current: { flush: () => null as string | null, tagOverlayRecalcRef: { current: false }, tagOverlayMatchesRef: { current: [] } } },
    secondary: { current: { flush: () => null as string | null, tagOverlayRecalcRef: { current: false }, tagOverlayMatchesRef: { current: [] } } },
  }

  constructor(
    private layoutState: WorkspaceLayoutState,
    private saveDocumentFn: (path: string, content: string, meta: DocumentMeta) => Promise<void>,
  ) {
    this.primaryPane = { path: null, content: '', meta: {}, isDirty: false }
    this.secondaryPane = { path: null, content: '', meta: {}, isDirty: false }
  }
}
```

### 3.2 Métodos de mutación (nuevos)

| Método | Descripción | Reemplaza a |
|--------|-------------|-------------|
| `loadPaneDocument(pane, path, content, meta)` | Carga un documento en un pane | `useLoadDocument` en `use-project-editor-actions.ts` |
| `updatePaneContent(pane, content)` | Actualiza contenido y marca dirty | `useEditorViewActions.updateEditorValue` |
| `updatePaneMeta(path, meta)` | Actualiza meta de un pane por path | `useEditFileTagsAction` |
| `markPaneSaved(path)` | Limpia isDirty del pane que tiene ese path | `useSaveDocumentNow` |
| `clearPanes()` | Limpia ambos paneles | `useClearEditor` |
| `setLayoutState(layout)` | Actualiza el estado de layout | Setters de layout actuales |

### 3.3 Métodos de consulta (ya existen o extendidos)

| Método | Descripción |
|--------|-------------|
| `getPaneDocument(pane)` | Info del pane |
| `getActivePaneDocument()` | Info del pane activo |
| `isPaneDirty(pane?)` | Dirty check |
| `canSwitchAwayFrom(pane?)` | Puede cambiar de pane |
| `canSwitchToFile(filePath)` | Puede seleccionar archivo (reemplaza `canSelectFile`) |
| `isPathOpenAndDirty(path)` | El path está abierto y dirty en algún pane |
| `hasDirtyPathInsideFolder(folderPath)` | Hay pane dirty dentro de una carpeta |
| `getPanePath(pane)` | Path del pane |
| `getPaneMeta(pane)` | Meta del pane |

### 3.4 Getters expuestos (readonly)

```ts
get primary(): Readonly<PaneDocumentState>
get secondary(): Readonly<PaneDocumentState>
get layout(): Readonly<WorkspaceLayoutState>
```

> Nota: `.primary` y `.secondary` solo se usan desde **dentro** del workspace (componentes de editor). Código fuera del workspace debe usar los métodos de consulta de arriba.

---

## 4. Cambios en el estado Preact

### 4.1 `use-project-editor-core-state.ts`

**Eliminar** completamente `primaryPane` y `secondaryPane` de aquí. Este archivo solo maneja estado global NO relacionado con paneles:

```ts
// ANTES
const [primaryPane, setPrimaryPane] = useState<PaneDocumentState>(...)
const [secondaryPane, setSecondaryPane] = useState<PaneDocumentState>(...)

// DESPUÉS
// (nada de paneles aquí)
```

### 4.2 `use-project-editor-state.ts`

**Eliminar** de `values`:
- `primaryPane`
- `secondaryPane`

**Eliminar** de `setters`:
- `setPrimaryPane`
- `setSecondaryPane`

**Eliminar** la construcción de `paneState` con estado crudo.

**Eliminar** la llamada a `deriveActivePaneDocument(workspaceLayout, coreState.primaryPane, coreState.secondaryPane)` — ahora `PaneWorkspace` hace eso internamente.

### 4.3 `use-project-editor-sub-state-hooks.ts`

**Eliminar** `useDocumentState` y `usePaneState` (o moverlos a `pane/` si hacen falta internamente).

---

## 5. Cambios en hooks de acciones

### 5.1 `use-project-editor-actions.ts`

| Función | Cambio |
|---------|--------|
| `useClearEditor` | Llama `paneWorkspace.clearPanes()` en vez de `setPrimaryPane(emptyPane)` / `setSecondaryPane(emptyPane)` |
| `useLoadDocument` | Llama `paneWorkspace.loadPaneDocument(pane, path, content, meta)` en vez de construir `loadedPane` y setearlo |
| `useSaveDocumentNow` | Eliminar la lógica que muta `isDirty` en paneles. `PaneWorkspace.savePaneIfDirty()` ya maneja eso. Llamar `paneWorkspace.markPaneSaved(path)` después de guardar exitosamente. |

**Eliminar** `saveDocumentNow` de `CoreProjectEditorActions`. La función de guardado debe vivir solo dentro de `pane/` como callback inyectado en el constructor de `PaneWorkspace`.

### 5.2 `use-project-editor-ui-actions-helpers.ts`

| Función | Cambio |
|---------|--------|
| `useEditorViewActions.updateEditorValue` | Llama `paneWorkspace.updatePaneContent(targetPane, nextValue)` en vez de `setPrimaryPane(...)` / `setSecondaryPane(...)` |
| `useEditorViewActions.saveNow` | Usa `paneWorkspace.savePaneIfDirty(targetPane)` (ya hecho en consolidación anterior) |
| `useMoveFileAction` | Usa `paneWorkspace.isPathOpenAndDirty(path)` en vez de leer `.primary.isDirty` / `.secondary.isDirty` |

### 5.3 `use-project-editor-file-actions.ts`

| Función | Cambio |
|---------|--------|
| `useEditFileTagsAction` | Llama `paneWorkspace.updatePaneMeta(path, nextMeta)` en vez de mutar paneles directamente |
| `isTargetDirty` | Usa `paneWorkspace.isPathOpenAndDirty(path)` |

### 5.4 `use-project-editor-layout-actions.ts`

| Función | Cambio |
|---------|--------|
| `useSetWorkspaceActivePaneAction` | Usa `workspace.getPaneDocument(pane)` y `workspace.savePaneIfDirty(pane)` (ya hecho) |
| `useSelectFileAction` | Usa `workspace.canSwitchToFile(filePath)` en vez de leer `workspace.primary.isDirty` directamente |

### 5.5 `project-editor-folder-logic.ts`

**Eliminar** `hasDirtyPathInsideFolder` y `hasDirtyPathInsideFolderUsingWorkspace`. Mover la lógica a `PaneWorkspace.hasDirtyPathInsideFolder(folderPath)`.

---

## 6. Cambios en componentes del workspace

Los componentes dentro de la caja workspace (paneles del editor) **sí pueden** conocer detalles internos. Pero la forma en que reciben los datos cambia:

### 6.1 `workspace-editor-panels.tsx`

**Ya no** accede a `state.primaryPane` / `state.secondaryPane` desde el modelo Preact. Recibe la información del pane activo via props o acciones, o consulta `PaneWorkspace`.

**Ya no** elige qué `serializationRef` pasa a cada `editor-panel`. `PaneWorkspace` provee los refs internamente.

### 6.2 `editor-panel.tsx` y `rich-markdown-editor.tsx`

Siguen recibiendo `serializationRef` (es un detalle interno del workspace), pero ahora el ref viene de `PaneWorkspace`, no del estado global Preact.

El componente `rich-markdown-editor` sigue mutando `serializationRef.current.flush` (eso es su responsabilidad como implementación del editor), pero el ref lo posee `PaneWorkspace`.

---

## 7. Cambios en `use-project-editor.ts`

### 7.1 Constructor de `PaneWorkspace`

**Antes:**
```ts
const paneWorkspace = new PaneWorkspace(
  layoutState.workspaceLayout,
  paneState.primaryPane,
  paneState.secondaryPane,
  { primary: primarySerializationRef, secondary: secondarySerializationRef },
  (path, content, meta) => saveDocumentNowRef.current?.(path, content, meta) ?? Promise.resolve(),
)
```

**Después:**
```ts
const paneWorkspace = new PaneWorkspace(
  layoutState.workspaceLayout,
  (path, content, meta) => saveDocumentNowRef.current?.(path, content, meta) ?? Promise.resolve(),
)
```

`PaneWorkspace` crea sus propios paneles vacíos y sus propios `serializationRefs` internamente.

### 7.2 No exponer `serializationRefs`

Eliminar `serializationRefs` del objeto `ProjectEditorModel` retornado. Los componentes del workspace obtienen los refs que necesitan a través de `PaneWorkspace`, no directamente del modelo.

---

## 8. Cambios en tipos

### 8.1 `project-editor-types.ts`

**Eliminar** de `ProjectEditorStateValues`:
- `primaryPane: PaneDocumentState`
- `secondaryPane: PaneDocumentState`

**Eliminar** `ProjectEditorPaneState` (ya no se usa desde fuera del módulo pane).

**Eliminar** `serializationRefs` de `ProjectEditorModel`.

**Mantener** `EditorSerializationRefs` pero moverlo a `pane/pane-types.ts` (tipo interno del módulo). `project-editor-types.ts` puede re-exportarlo si los componentes del workspace lo necesitan, pero el tipo canonico vive en `pane/`.

### 8.2 `editor-serialization-refs.ts`

**Eliminar** este archivo (está huérfano y contiene una interfaz duplicada/anticuada).

---

## 9. Estructura final del módulo `pane/`

```
src/features/project-editor/pane/
├── index.ts                    ← barrel: exporta PaneWorkspace + tipos públicos
├── pane-workspace.ts           ← fachada completa: estado + mutación + save + flush + autosave
├── pane-save-logic.ts          ← executePaneSave (interno, no exportado en barrel)
├── pane-types.ts               ← tipos internos del módulo (EditorSerializationRefs, etc.)
└── pane-state-utils.ts         ← helpers internos (deriveActivePaneDocument, canSelectFile, etc.)
```

---

## 10. Archivos que cambian

| Archivo | Acción |
|---------|--------|
| `pane/pane-workspace.ts` | **EXTENDER** — agregar estado interno, métodos de mutación, crear serializationRefs internamente |
| `pane/pane-types.ts` | **CREAR** — tipos internos del módulo |
| `pane/pane-state-utils.ts` | **CREAR** — mover `deriveActivePaneDocument`, `canSelectFile`, etc. desde `project-editor-logic.ts` |
| `pane/index.ts` | **ACTUALIZAR** — exportar nuevos tipos públicos |
| `use-project-editor-core-state.ts` | **ELIMINAR** primaryPane/secondaryPane de aquí |
| `use-project-editor-state.ts` | **ELIMINAR** primaryPane/secondaryPane de values y setters |
| `use-project-editor-sub-state-hooks.ts` | **ELIMINAR** useDocumentState/usePaneState |
| `use-project-editor-actions.ts` | **REFACTORIZAR** — delegar en PaneWorkspace, eliminar saveDocumentNow de core |
| `use-project-editor-ui-actions-helpers.ts` | **REFACTORIZAR** — delegar mutaciones en PaneWorkspace |
| `use-project-editor-file-actions.ts` | **REFACTORIZAR** — delegar en PaneWorkspace |
| `use-project-editor-layout-actions.ts` | **REFACTORIZAR** — usar métodos de fachada |
| `project-editor-folder-logic.ts` | **REFACTORIZAR** — mover lógica de paneles a PaneWorkspace |
| `use-project-editor.ts` | **SIMPLIFICAR** — constructor de PaneWorkspace sin estado crudo ni refs |
| `project-editor-types.ts` | **LIMPIAR** — quitar paneState y serializationRefs del modelo global |
| `editor-serialization-refs.ts` | **ELIMINAR** |
| `tests/pane-workspace.test.ts` | **AGREGAR** tests para métodos de mutación |

---

## 11. Beneficio neto

- **`pane/` es un módulo autónomo** con fronteras claras.
- **Nada fuera del workspace conoce la estructura interna** de los paneles.
- **Preact state se simplifica** — deja de arrastrar `primaryPane`/`secondaryPane` por toda la app.
- **Los setters de paneles desaparecen** del contrato público. Solo `PaneWorkspace` puede mutar paneles.
- **Menor acoplamiento** entre sidebar/dialogs y el modelo de paneles.
- **Tests más fáciles** — se puede testear `PaneWorkspace` en aislamiento sin montar estado Preact.

(End of document)
