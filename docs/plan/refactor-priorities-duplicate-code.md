# Refactors Prioritarios por Duplicación de Código

Fecha: 2026-04-04
Fuente principal: `.jscpd-report/jscpd-report.json` (`npx jscpd src electron tests example-fantasia docs --min-tokens 50 --reporters console,json --output .jscpd-report`)

## Resumen Ejecutivo

- Clones detectados: **21**
- Líneas duplicadas: **274** (2.43%)
- Tokens duplicados: **2759** (2.54%)
- Mayor concentración: **tests** y **`src/features/project-editor`**

## Priorización

### P0 (Alta) - Reducir duplicación en tests de `project-editor`

**Impacto esperado**
- Menos fragilidad en tests y menor costo de mantenimiento.
- Menos ruido en diffs cuando cambie el setup del harness.

**Evidencia principal (jscpd)**
- `tests/use-project-editor.test.ts`: 6 clones, 95 líneas duplicadas (42.41% del archivo).
- Clones entre `tests/use-project-editor.test.ts` y `tests/project-editor-conflict-flow.test.ts`.
- Setup repetido `container + render + act + harness` en múltiples bloques.
- Repetición de setup/teardown de contenedor también entre `tests/sidebar-filter.test.ts` y `tests/sidebar-panels.test.ts`.

**Refactors sugeridos**
1. Extraer helper `mountProjectEditorHarness()` en `tests/helpers/project-editor-harness.ts`.
2. Extraer helper `createDomContainer()` en `tests/helpers/dom-container.ts` para `beforeEach/afterEach`.
3. Extraer builder de eventos externos para conflicto (p. ej. `buildExternalChangeEvent(path)`).
4. Reusar fixtures de API mock (`setupTramaApiMock`) con variantes parametrizadas en lugar de copiar bloques.

**Archivos objetivo (primer sprint)**
- `tests/use-project-editor.test.ts`
- `tests/project-editor-conflict-flow.test.ts`
- `tests/sidebar-panels.test.ts`
- `tests/sidebar-filter.test.ts`

**Riesgo**
- Bajo en runtime, medio en regresión de tests si el helper no conserva orden de `act()`.

**Criterio de cierre**
- Reducir al menos 40% de clones dentro de `tests/*` detectados por jscpd.

---

### P1 (Media) - Consolidar tipos/props repetidos en Sidebar

**Impacto esperado**
- Menos drift entre contratos de props similares.
- Menor probabilidad de inconsistencias al agregar nuevas acciones de sidebar.

**Evidencia principal (jscpd)**
- Clones entre:
  - `src/features/project-editor/components/sidebar/sidebar-panel-body.tsx`
  - `src/features/project-editor/components/sidebar/sidebar-panel.tsx`
  - `src/features/project-editor/components/sidebar/sidebar-explorer-content.tsx`
- Duplicación en listas de callbacks y tipos de props (`onCreateArticle`, `onCreateCategory`, `onRenameFile`, `onDeleteFile`, etc.).

**Refactors sugeridos**
1. Extraer tipos compartidos a `src/features/project-editor/components/sidebar/sidebar-types.ts`:
   - `SidebarFileActions`
   - `SidebarSelectionProps`
   - `SidebarPanelCommonProps`
2. Reutilizar `type`/`interface` comunes en `sidebar-panel.tsx`, `sidebar-panel-body.tsx`, `sidebar-explorer-content.tsx`.
3. Evitar duplicar firmas de callbacks repitiendo intersecciones de tipos (`& SidebarFileActions`).

**Archivos objetivo**
- `src/features/project-editor/components/sidebar/sidebar-panel.tsx`
- `src/features/project-editor/components/sidebar/sidebar-panel-body.tsx`
- `src/features/project-editor/components/sidebar/sidebar-explorer-content.tsx`

**Riesgo**
- Bajo, pero requiere validar tipos TS y compilación de tests de UI.

**Criterio de cierre**
- Disminución visible de clones TSX de contratos/props (al menos 2 grupos menos en jscpd).

---

### P1 (Media) - Extraer estado y setters comunes en `use-project-editor-state`

**Impacto esperado**
- Menor duplicación en definición de estado/acciones setter.
- Más claridad para evolucionar el modelo del editor.

**Evidencia principal (jscpd)**
- Clones internos en:
  - `src/features/project-editor/use-project-editor-state.ts`
- Repeticiones de shape de estado y shape de setters.

**Refactors sugeridos**
1. Definir tipo único `ProjectEditorStateValues` y derivar subsets por utilidad.
2. Definir tipo `ProjectEditorStateSetters` centralizado.
3. Reemplazar bloques repetidos por utilidades de composición (`buildValues`, `buildSetters`) con tipos derivados.

**Archivo objetivo**
- `src/features/project-editor/use-project-editor-state.ts`

**Riesgo**
- Medio-bajo por impacto tipado transversal.

**Criterio de cierre**
- Eliminar clones internos de este archivo reportados por jscpd.

---

### P2 (Media-Baja) - Unificar estructura de modales de Sidebar

**Impacto esperado**
- Menos código duplicado de markup/estructura en diálogos.
- Mejor consistencia visual y de accesibilidad.

**Evidencia principal (jscpd)**
- Clon entre:
  - `src/features/project-editor/components/sidebar/sidebar-create-dialog.tsx`
  - `src/features/project-editor/components/sidebar/sidebar-file-actions-dialog.tsx`
- Bloque de modal contenedor + panel + título/hint es muy similar.

**Refactors sugeridos**
1. Extraer componente base `SidebarModalShell` con props: `title`, `hint`, `onCancel`, `children`.
2. Reescribir ambos diálogos sobre esa base.

**Archivos objetivo**
- `src/features/project-editor/components/sidebar/sidebar-create-dialog.tsx`
- `src/features/project-editor/components/sidebar/sidebar-file-actions-dialog.tsx`
- (nuevo) `src/features/project-editor/components/sidebar/sidebar-modal-shell.tsx`

**Riesgo**
- Bajo.

**Criterio de cierre**
- Eliminar el clone TSX entre ambos diálogos.

---

### P3 (Baja) - DRY en CSS de panel/sidebar

**Impacto esperado**
- Menor repetición de reglas y más facilidad de theme/tuning.

**Evidencia principal (jscpd)**
- 1 clone en `src/index.css` (`8 líneas / 90 tokens`) alrededor de bloques de estilos de sidebar.

**Refactors sugeridos**
1. Introducir utilidades CSS o custom properties para grupos repetidos.
2. Consolidar reglas repetidas en selectores compuestos.

**Archivo objetivo**
- `src/index.css`

**Riesgo**
- Medio si se altera especificidad; validar regresión visual.

**Criterio de cierre**
- Cero clones CSS en jscpd para `src/index.css` con mismo umbral.

## Orden recomendado de ejecución (iteraciones cortas)

1. ~~P0 tests harness y container helpers.~~ (no me importa que haya código duplicado en las pruebas)
2. ~~P1 tipos compartidos de sidebar.~~
3. ~~P1 estado/setters de `use-project-editor-state`.~~
4. P2 modal shell común.
5. P3 consolidación CSS.

## Validación por iteración

En cada iteración, ejecutar:

```bash
npm run lint
npm test
npx jscpd src electron tests example-fantasia docs --min-tokens 50 --reporters console,json --output .jscpd-report
```

## Métrica objetivo global

- Bajar duplicación total de **2.43%** a **< 1.8%** sin perder cobertura ni legibilidad.
- Reducir clones en `tests/*` como primer driver de mejora.
