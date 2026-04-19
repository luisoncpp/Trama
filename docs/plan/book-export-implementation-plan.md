# Exportar Libro - Plan de Implementacion

Fecha: 2026-04-13 → 2026-04-16  
Estado: ✅ Completado (Fases A-E implementadas, hardening de PDF terminado, soporte de imágenes en PDF/DOCX/EPUB, soporte de estilos de heading en DOCX con alineación centrada)

## Nota sobre headings en DOCX (2026-04-16)

**DOCX**: ✅ Soporta estilos de heading (Heading1-Heading6) para líneas markdown `#`, `##`, etc.
**DOCX**: ✅ Respeta alineación centrada en headings dentro de directivas `<!-- trama:center:start -->`

El renderer DOCX ahora tiene:
- `createHeadingParagraph(text, level, centered)` - crea párrafos con estilo de heading y alineación
- `detectHeading(line)` - detecta líneas markdown de heading (`# Title` o `#/Title`)
- `processLine()` propagando el flag `centered` a ambas funciones de creación de párrafo

Pruebas de regresión en `tests/book-export-renderers.test.ts`:
- `renders docx with Heading1 style for h1 markdown`
- `renders docx with centered alignment for headings inside center directives`
- `renders docx with multiple heading levels`

## Nota sobre imágenes

**PDF**: ✅ Soporta imágenes embebidas (archivos locales PNG/JPG + data URLs base64)  
**DOCX**: ✅ Soporta imágenes embebidas (archivos locales PNG/JPG + data URLs base64) via `ImageRun`  
**EPUB**: ✅ Soporta imágenes embebidas mediante preprocesado: data URLs se materializan en archivos temporales y rutas locales se reescriben como `file://` para compatibilidad con `epub-gen`.

Cobertura de regresión vigente:
- `tests/book-export-renderers.test.ts` valida HTML con conversión de imagen local a data URL.
- `tests/book-export-renderers.test.ts` valida PDF con imagen local + data URL en el mismo capítulo.
- `tests/book-export-renderers.test.ts` valida DOCX con artefactos embebidos en `word/media`.
- `tests/book-export-renderers.test.ts` valida EPUB con imágenes data URL y rutas locales.

## 1. Objetivo

Implementar una funcionalidad de exportacion de libro con estas reglas de negocio:

1. Exportar solo contenido dentro de `book/` y subcarpetas.
2. Respetar el orden del indice.
3. No exportar tags ni comentarios HTML (`<!-- ... -->`) en Markdown.
4. Soportar formatos: `markdown`, `html`, `docx`, `epub`, `pdf`.

## 2. Alcance funcional

Incluido en esta iteracion:

1. Exportacion desde proyecto abierto en Trama.
2. Compilacion de manuscrito unificado desde `book/`.
3. Generacion de archivo de salida en disco (no solo clipboard).
4. Flujo de UI con selector de formato y dialogo de guardar.
5. Validaciones, manejo de errores y pruebas de regresion.

Fuera de alcance (fase posterior):

1. Estilos avanzados por plantilla de exportacion.
2. Portada, TOC avanzado y metadatos editoriales complejos.
3. Exportacion parcial por seleccion de capitulos.

## 3. Definicion de "orden del indice"

Para evitar ambiguedad, el orden se define asi:

1. Base: orden del arbol en `book/` tal como aparece en snapshot del proyecto.
2. Si existe orden explicito en `index.corkboardOrder[folder]`, se usa para archivos del folder.
3. Fallback: archivos no presentes en corkboardOrder se agregan al final en orden alfabetico estable.

Nota: este enfoque mantiene compatibilidad con el indice actual (`.trama.index.json`) y evita romper proyectos existentes.

## 4. Reglas de saneamiento y directivas

Se aplicara un pipeline por etapas, con comportamiento especifico por formato:

1. Etapa comun (todos los formatos):
   - remover bloque YAML frontmatter completo del documento fuente (elimina tags en origen)
   - normalizar saltos de linea y espacios finales
2. Etapa de directivas HTML comment (`<!-- ... -->`):
   - `markdown`: remover directivas/comentarios del output final
   - `html`, `docx`, `epub`, `pdf`: interpretar comentarios como directivas semanticas (ej. pagebreak/center/spacer) y convertirlos al formato destino

Justificacion:

1. En markdown final no deben quedar comentarios HTML.
2. En los demas formatos, los comentarios/directivas son la fuente de layout y no se deben perder.

## 5. Arquitectura propuesta

### 5.1 Contrato IPC

Agregar nuevo canal dedicado (separado de AI export):

1. Canal: `trama:book:export`
2. Request:
   - `projectRoot: string`
   - `format: 'markdown' | 'html' | 'docx' | 'epub' | 'pdf'`
   - `outputPath: string`
   - `title?: string`
   - `author?: string`
3. Response:
   - `success: boolean`
   - `outputPath: string`
   - `format: ...`
   - `exportedFiles: number`

### 5.2 Main process

Nuevo servicio principal:

1. `book-export-service.ts` (orquestador)
2. Responsabilidades:
   - resolver lista de archivos exportables en `book/`
   - ordenar por indice
   - parsear markdown a representacion intermedia (AST/document model)
   - aplicar saneamiento y resolucion de directivas por formato
   - componer manuscrito unificado
   - delegar renderer por formato
   - escribir archivo final

Renderers por formato:

1. Markdown renderer: concatena capitulos con separadores.
2. HTML renderer: usa `marked` + template HTML base, materializando directivas a HTML semantico/CSS de impresion.
3. DOCX renderer: generacion directa desde estructura semantica (dependencia propuesta: `docx`), mapeando pagebreak a salto nativo de Word.
4. EPUB renderer: paquete EPUB desde capitulos XHTML (dependencia propuesta: `epub-gen`).
5. PDF renderer: generacion directa orientada a impresion con saltos de pagina semanticos (sin depender de roundtrip HTML->PDF como camino principal).

### 5.3 Renderer/UI

Integracion en seccion `Transfer` del sidebar:

1. Boton `Export Book`.
2. Dialogo con:
   - formato de salida
   - metadata opcional (titulo, autor)
   - accion de seleccionar ruta destino
3. Confirmacion de exito con ruta generada.

## 6. Archivos a crear/modificar

### 6.1 Shared contract

1. Modificar `src/shared/ipc.ts`
2. Modificar `src/types/trama-api.d.ts`

### 6.2 Electron main

1. Modificar `electron/ipc.ts`
2. Modificar `electron/preload.cts`
3. Modificar `electron/ipc/handlers/ai-handlers.ts` o crear `electron/ipc/handlers/book-export-handlers.ts`
4. Crear `electron/services/book-export-service.ts`
5. Crear `electron/services/book-export-order.ts`
6. Crear `electron/services/book-export-sanitize.ts`
7. Crear `electron/services/book-export-directives.ts`
8. Crear `electron/services/book-export-renderers.ts`
9. Crear `electron/services/book-export-docx-renderer.ts`
10. Crear `electron/services/book-export-pdf-renderer.ts`

### 6.3 Renderer

1. Crear `src/features/project-editor/use-book-export.ts`
2. Crear `src/features/project-editor/components/book-export-dialog.tsx`
3. Modificar `src/features/project-editor/components/sidebar/sidebar-transfer-content.tsx`
4. Modificar `src/features/project-editor/project-editor-view.tsx`

### 6.4 Tests

1. Crear `tests/book-export-order.test.ts`
2. Crear `tests/book-export-sanitize.test.ts`
3. Crear `tests/book-export-service.test.ts`
4. Crear `tests/book-export-ipc-handler.test.ts`
5. Crear `tests/use-book-export.test.ts`

## 7. Plan por fases

## Fase A - Contrato y base de servicio

1. Definir schemas Zod para request/response de `book export`.
2. Registrar canal IPC + preload API tipada.
3. Crear esqueleto de servicio con `format = markdown` primero.

Salida esperada:

- Export markdown de `book/` funcionando end-to-end con path de salida.

## Fase B - Orden y saneamiento

1. Implementar resolucion de archivos `book/**.md`.
2. Implementar orden por indice + fallback estable.
3. Implementar pipeline por formato: sin tags/frontmatter para todos, comments removidos solo en markdown y convertidos como directivas en los otros formatos.

Salida esperada:

- Manuscrito compilado limpio y ordenado correctamente.

## Fase C - Multi-formato

1. Implementar renderer HTML.
2. Implementar renderer DOCX directo (sin conversion via HTML).
3. Implementar renderer EPUB.
4. Implementar renderer PDF directo (sin depender de conversion via HTML).

Salida esperada:

- Los 5 formatos generan archivo valido en disco.

## Fase D - UI y experiencia

1. Crear dialogo en renderer.
2. Agregar accion en sidebar Transfer.
3. Mostrar progreso basico y errores legibles.

Salida esperada:

- Usuario exporta libro sin usar consola ni pasos manuales.

## Fase E - Pruebas y hardening

1. Unit tests de orden/saneamiento/conversion.
2. IPC tests de payload y envelopes.
3. Hook/component tests de flujo UI.
4. Pruebas manuales de archivos finales en lectores reales.

Salida esperada:

- Cobertura de regresion suficiente y comportamiento estable.

## 8. Dependencias sugeridas

Paquetes nuevos propuestos:

1. `docx` para generar DOCX con pagebreak nativo.
2. `epub-gen` para EPUB.

Reuso de existentes:

1. `marked` para markdown->html.

Nota:

1. PDF no se plantea como resultado de un pipeline html-first; se prioriza renderer dedicado para conservar semantica de saltos de pagina.

## 9. Criterios de aceptacion

1. Solo se exportan archivos dentro de `book/`.
2. El orden de salida respeta indice con fallback estable.
3. Ningun `tag` aparece en output final.
4. En output `markdown` no aparecen comentarios HTML.
5. En `html`, `docx`, `epub`, `pdf` las directivas en comentarios HTML se convierten al equivalente del formato.
6. Se generan correctamente `md`, `html`, `docx`, `epub`, `pdf`.
7. Errores de ruta/permisos/formato se reportan con envelope consistente.
8. `npm run lint`, `npm run build` y `run-tests.ps1` pasan.

## 10. Riesgos y mitigaciones

Riesgo 1: discrepancia entre "orden en indice" y orden visual esperado.  
Mitigacion: fijar algoritmo y cubrirlo con tests de orden por carpeta.

Riesgo 2: perdida de fidelidad en DOCX/PDF para pagebreak y directivas de layout.  
Mitigacion: renderer directo por formato con mapeo semantico de directivas (sin dependencia html-first).

Riesgo 3: diferencias de render entre lectores DOCX/EPUB/PDF.  
Mitigacion: set minimo de estilos y validacion manual en lectores reales como parte de Fase E.

Riesgo 4: conflictos con limites lint (`max-lines`).  
Mitigacion: separar servicio por modulos (order/sanitize/renderers).

Riesgo 5: fallo de exportacion PDF con caracteres fuera de WinAnsi (ej. Unicode extendido).  
Mitigacion: migrar renderer PDF a fuentes Unicode embebidas (TTF/OTF) en `pdf-lib` y agregar pruebas con textos multilenguaje.

## 11. Checklist de cierre

1. Actualizar `docs/live/current-status.md` con estado de Book Export.
2. Actualizar `docs/live/file-map.md` con nuevos archivos TS/TSX.
3. Registrar aprendizaje en `docs/lessons-learned/` si aplica.
4. Mover este plan a `docs/plan/done/` cuando termine la implementacion.