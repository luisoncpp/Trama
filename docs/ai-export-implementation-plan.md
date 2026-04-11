# AI Export - Plan de Implementacion (Phase 4 WS5)

> Fecha: 2026-04-11  
> Alcance: cerrar la exportacion AI de forma end-to-end (UX + hardening + tests + docs).

## 1. Objetivo

Completar la funcionalidad de exportacion AI para que cualquier usuario pueda:

1. Seleccionar multiples archivos markdown desde un dialogo.
2. Elegir si incluir frontmatter.
3. Exportar en formato delimitado compatible con importacion.
4. Copiar el resultado al portapapeles con feedback claro de exito o error.

Formato canonico esperado:

=== FILE: relative/path.md ===

## 2. Estado actual resumido

Implementado:

- Contrato IPC y canal de exportacion.
- Handler de exportacion en main process.
- Servicio de formateo de exportacion.

Pendiente:

- Flujo UX de exportacion en renderer (accion, dialogo, seleccion, copy).
- Cobertura de pruebas especifica para exportacion.
- Endurecimiento de validacion de rutas del servicio.

## 3. Enfoque tecnico

Principios para esta implementacion:

1. Aislar exportacion de la seleccion activa del editor (selectedPath sigue single-select).
2. Reutilizar patrones existentes de AI import para reducir riesgo y mantener consistencia.
3. Priorizar seguridad de rutas en main process antes de abrir UX a usuario final.
4. Entregar en incrementos pequenos con pruebas en cada fase.

## 4. Plan por fases

## Fase A - Hardening backend y contrato

Objetivo: blindar exportacion ante paths invalidos y errores de acceso.

Archivos foco:

- src/shared/ipc.ts
- electron/ipc/handlers/ai-handlers.ts
- electron/services/ai-export-service.ts
- electron/services/document-repository.ts (referencia de guardas)

Tareas:

1. Revisar validacion de rutas en ai-export-service y alinear con guardas del repositorio.
2. Garantizar que errores se devuelvan en envelope consistente (codigo + mensaje).
3. Cubrir casos de archivos faltantes, paths fuera de raiz y entradas vacias.

Criterio de salida:

- El servicio rechaza entradas inseguras o inconsistentes sin romper el proceso.

## Fase B - UX renderer de exportacion

Objetivo: habilitar flujo usable de exportacion desde sidebar.

Archivos foco:

- src/features/project-editor/project-editor-view.tsx
- src/features/project-editor/components/sidebar/sidebar-explorer-content.tsx
- src/features/project-editor/use-ai-import.ts (referencia de patron)

Nuevos archivos propuestos:

- src/features/project-editor/use-ai-export.ts
- src/features/project-editor/components/ai-export-dialog.tsx

Tareas:

1. Agregar trigger de Export en el area de Explorer.
2. Implementar hook use-ai-export con estado de dialogo y seleccion multiple.
3. Construir dialogo con lista de archivos visibles y opcion includeFrontmatter.
4. Invocar tramaApi.aiExport con selectedPaths.
5. Copiar formattedContent a clipboard y mostrar estado (success/error).

Criterio de salida:

- El usuario puede exportar multiples archivos y recibe confirmacion clara.

## Fase C - Tests de regresion

Objetivo: evitar regresiones funcionales y de contrato.

Archivos de prueba sugeridos:

- tests/ai-export-service.test.ts (nuevo)
- tests/ipc-contract.test.ts (extender)
- tests/sidebar-panels.test.ts o test dedicado de dialogo export (extender o nuevo)

Cobertura minima:

1. Servicio exporta multiples archivos con formato correcto.
2. includeFrontmatter true/false cambia el resultado como se espera.
3. Archivo faltante devuelve error controlado.
4. Payload invalido devuelve envelope de error esperado.
5. Renderer llama aiExport con seleccion correcta y copia al portapapeles.

Criterio de salida:

- Pruebas nuevas pasan localmente y no rompen suites existentes.

## Fase D - Cierre documental y verificacion final

Objetivo: dejar trazabilidad completa y evitar drift.

Docs a actualizar:

- docs/current-status.md
- docs/file-map.md
- docs/ai-import-export-implementation-map.md
- docs/lessons-learned/README.md (si aparece aprendizaje relevante)

Checklist final:

1. npm run lint
2. npm run build
3. powershell -ExecutionPolicy Bypass -File scripts/run-tests.ps1
4. Confirmar reporte en reports/test-report.txt

Criterio de salida:

- Estado de producto, ownership de archivos y lecciones quedan sincronizados con el codigo.

## 5. Orden de ejecucion recomendado (PRs)

1. PR 1: Hardening backend + tests del servicio.
2. PR 2: Hook y dialogo de exportacion + wiring UI.
3. PR 3: Tests renderer/IPC y ajustes UX.
4. PR 4: Actualizacion documental + validacion final.

## 6. Riesgos y mitigaciones

Riesgo 1: acoplar exportacion al estado de documento activo.
Mitigacion: mantener seleccion multiarchivo en hook/dialogo dedicado.

Riesgo 2: crecimiento de archivos TS/TSX excediendo limites de lint.
Mitigacion: dividir en hook y componentes pequenos desde el inicio.

Riesgo 3: errores silenciosos al copiar al portapapeles.
Mitigacion: feedback explicito en UI y tests de flujo de copia.

## 7. Definicion de Done

La exportacion AI se considera completada cuando:

1. Existe accion visible de exportacion en la UI.
2. El dialogo permite multi-seleccion e include/exclude frontmatter.
3. La salida se copia al portapapeles en formato canonico.
4. Errores de contrato/ruta se manejan de forma segura y visible.
5. Lint, build y tests pasan.
6. La documentacion principal refleja el estado real.
