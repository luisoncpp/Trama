# Book Export - Arquitectura y Guía de Renderers

## Propósito

Este documento describe la arquitectura de exportación de libros en el codebase. Es la referencia canonical para entender cómo el markdown del libro se convierte en PDF (u otro formato).

Términos de dominio compartidos: `CONTEXT.md` (sección Book export). Decisión de forma PDF: [ADR 0004](../adr/0004-book-pdf-via-html-print-segments.md).

---

## Arquitectura de Archivos

```
book-export-service.ts          — Orquestador: compila capítulos, sanitiza, dispatch por formato
├── book-export-order.ts        — Ordena archivos por índice corkboardOrder
├── book-export-sanitize.ts     — Elimina frontmatter, normaliza saltos
├── book-export-directives.ts   — Parsea directivas layout; `replaceDirectivesForPdfPrint`, `stripLeadingPagebreakAndBlankLines`
├── book-export-image-utils.ts  — Resolve paths, carga bytes, parsea data URLs, lee dimensiones PNG/JPEG, escala para DOCX, extrae referencias markdown
│
├── book-export-inline-markdown.ts — Inline bold/italic runs via marked.lexer (DOCX)
├── book-export-renderers.ts    — Modelo común BookExportChapter + renderer HTML/Markdown/PDF (`renderChapterHtmlFragmentForPdf`, `normalizePdfPrintChapterBody`)
│
├── book-export-pdf-renderer.ts         — Orquestador PDF: segmentos → HTML → print → merge
├── book-export-pdf-segments.ts         — Manuscrito ordenado, gaps, split en PDF export segments
├── book-export-pdf-html.ts             — HTML de impresión por segmento (shell vs body-only)
├── book-export-pdf-print.ts            — Singleton BrowserWindow + printToPDF (inyectable en tests)
├── book-export-pdf-print.css           — Estilos impresión (@page A4 + márgenes, Times New Roman, límites de imagen)
├── book-export-pdf-merge.ts            — mergePdfSegments: copyPages lineal en memoria
│
├── book-export-docx-renderer.ts — DOCX via `docx` package
├── book-export-epub-renderer.ts — EPUB via `epub-gen`
```

### Punto de entrada PDF (`book-export-pdf-renderer.ts`)

Mantiene el import path estable para `book-export-service.ts`. Implementa `renderPdfBook(chapters, metadata, projectRoot)` sobre segmentos + HTML + print surface + merge.

---

## Export PDF

> **Estado:** Implementado según [ADR 0004](../adr/0004-book-pdf-via-html-print-segments.md) (2026-06-04). Tests en CI usan mock del print surface; export real requiere proceso Electron.

### Por qué segmentos

El motor lento era el layout PDF manual (`pdf-lib`, tokens por palabra). El camino rápido es **markdown → HTML → `printToPDF`**. Los segmentos **no** buscan paralelismo: un libro sin **Author page break** es un solo segmento.

Los segmentos existen porque un único HTML grande no garantiza saltos de página fiables en PDF. Cada **PDF export segment** es el markdown **entre** directivas `<!-- trama:pagebreak -->` (y variantes HTML). Esas líneas son **límites de corte**, no contenido del segmento. Al concatenar los PDF impresos, la unión entre segmentos **es** el salto de página del autor.

### Manuscrito ordenado e inter-document gap

1. Tomar `BookExportChapter[]` en orden corkboard.
2. Entre dos documentos consecutivos: si el anterior **no** terminó en author page break, insertar **inter-document gap** (equivalente a dos líneas en blanco en cuerpo). Este es el estándar de exportación para **todos** los formatos; si HTML hoy no lo hace, es un bug.
3. Recorrer el flujo unificado línea a línea; cada línea que sea solo author page break cierra el segmento actual y abre el siguiente.

Un segmento puede abarcar varios archivos fuente. No hay noción canonical de “capítulo” en export (carpeta vs archivo es organización del autor).

### Pipeline

```
Input: BookExportChapter[] + metadata + projectRoot
         │
         ▼
buildPdfExportSegments()     — manuscrito + gaps + split (sin líneas pagebreak en el body)
         │
         ▼
Por cada segmento i (solo segmentos con contenido imprimible):
         │
         ├── renderSegmentPrintHtml → documento HTML único (mismo shell para todos los índices)
         │   segmento 0: header opcional solo si metadata.title/author; sin fallback "Trama Book Export"
         │
         ├── renderChapterHtmlFragmentForPdf por capítulo del segmento:
         │   stripLeadingPagebreakAndBlankLines → replaceDirectivesForPdfPrint (sin pagebreak HTML)
         │   → marked.parse → normalizePdfPrintChapterBody (desenvuelve <p><img>)
         │   → <section class="trama-chapter">
         │
         ├── Escribir segment print document (temp file: segment-NNN.html bajo tmpdir del job)
         │
         ├── Book export print surface → await loadFile → fonts/layout → printToPDF
         │   (preferCSSPageSize: true; márgenes en book-export-pdf-print.css @page)
         │
         └── Uint8Array del segmento
         │
         ▼
mergePdfSegments(buffers)    — un PDFDocument, load cada buffer una vez, copyPages, save
         │
         └── Uint8Array final
```

### Book export print surface

- Un `BrowserWindow` oculto por proceso, reutilizado entre exportaciones (`dynamic import('electron')` para que Vitest importe el módulo sin Electron).
- Cola/mutex (`runBookExportPrintExclusive`): no intercalar `loadFile`/`printToPDF` si hay dos export concurrentes.
- Carga: `await webContents.loadFile(absolutePath)` + `document.fonts.ready` + dos `requestAnimationFrame` (no `once('did-finish-load')` suelto — evita carreras en la ventana reutilizada).
- `printToPDF({ printBackground: true, preferCSSPageSize: true })` — tamaño y márgenes desde `@page` en `book-export-pdf-print.css` (no duplicar márgenes en opciones Electron).
- `setBookExportPrintSurfaceForTests(mock)` para tests (mock de `printToPDF` sin ventana real).
- **Cleanup al cerrar la ventana principal**: `disposeBookExportPrintSurface()` se invoca en `win.on('closed')` dentro de `electron/main.ts` para destruir (`BrowserWindow.destroy()`) la ventana oculta cacheada tan pronto la ventana principal muere. `before-quit` queda como red de seguridad, pero no sirve como único hook porque la ventana oculta impide que el proceso entre a la fase de quit. Sin este cleanup temprano, la ventana oculta mantiene el proceso Electron vivo después de cerrar la principal en Windows/Linux, y el usuario tiene que forzar la terminación con Ctrl+C.
- Temp dir por job: `withBookExportTempDirectory` (`%TEMP%/trama-book-export-*` en Windows); se borra al terminar el export.
- Errores y warnings a **consola**; sin progreso por segmento en UI (v1).

### Tipografía y criterio de aceptación

- **Functional parity**: orden de contenido, directivas center/spacer, imágenes visibles, Unicode, saltos en uniones de segmento, inter-document gap.
- **Book export PDF typography**: `"Times New Roman", Times, serif` en CSS de impresión (con fallbacks). No se exige coincidencia pixel a pixel con pdf-lib legacy.

### Directivas layout en PDF

| Directiva | En segmento HTML |
|-----------|------------------|
| `<!-- trama:center:start/end -->` | `replaceDirectivesForPdfPrint` → `.trama-center` |
| `<!-- trama:spacer lines=N -->` | `.trama-spacer` |
| `<!-- trama:pagebreak -->` | **No** va dentro del segmento; solo delimita segmentos en `buildPdfExportSegments`. Líneas pagebreak al inicio del manuscrito se eliminan. |

### Imágenes en PDF

- Mismo preprocesado que otros formatos: `buildBookChapters()` embebe locales como `data:image/` antes del render.
- HTML: `marked.parse` + `normalizePdfPrintChapterBody` (quita `<p>` vacíos y desenvuelve `<p><img>`).
- Print CSS: `max-width: 100%`, `max-height: 26.17cm` (área imprimible A4 con márgenes ~50pt), `object-fit: contain` — evita portadas altas (p. ej. 665×997) que Chromium mueve a la página 2 dejando la 1 en blanco.
- `printToPDF` con `printBackground: true` para data URLs y fondos.

### PDF segment merge

- Un solo `PDFDocument` destino.
- Por cada buffer de segmento: `PDFDocument.load` → `copyPages` → `addPage`.
- **Prohibido** guardar/recargar el PDF acumulado entre segmentos (merge cuadrático).
- `pdf-lib` permanece solo para merge; desaparece el layout manual.

### Tests

| Archivo | Qué verifica |
|---------|----------------|
| `tests/book-export-pdf-segments.test.ts` | Split, gaps, pagebreak, strip inicial |
| `tests/book-export-pdf-html.test.ts` | CSS impresión, header solo segmento 0, sin pagebreak crudo |
| `tests/book-export-pdf-directives.test.ts` | `replaceDirectivesForPdfPrint`, `normalizePdfPrintChapterBody` |
| `tests/book-export-pdf-print.test.ts` | Mock injection, mutex, temp dir cleanup |
| `tests/book-export-pdf-merge.test.ts` | Orden y conteo de páginas al fusionar |
| `tests/book-export-renderers.test.ts` | Regresión funcional PDF (mock print surface, una página por segmento) |
| `tests/book-export-ipc-handler.test.ts` | Export PDF vía IPC con mock |

CI no lanza Electron real: `setBookExportPrintSurfaceForTests(createOnePagePdfMockPrintSurface())` en tests que llaman `renderPdfBook`.

### Playbook debug PDF lento o roto

1. Leer en consola `[book-export] PDF export segment count: N` al exportar.
2. Interceptar **segment print document** antes de que se borre el temp dir:
   - Windows: `%TEMP%\trama-book-export-<random>\segment-000.html`
   - Ejemplo: `C:\Users\<user>\AppData\Local\Temp\trama-book-export-fEpb7h\segment-000.html`
   - El directorio se elimina al finalizar el job (`withBookExportTempDirectory`).
3. Abrir `segment-000.html` en Chrome → Vista previa de impresión (debe coincidir con el PDF del segmento 0).
4. Si hay **página en blanco al inicio** en un segmento de portada:
   - ¿`<p><img>` sin normalizar? Debe quedar `<img>` suelto.
   - ¿Imagen más alta que el área imprimible? Revisar `max-height: 26.17cm` en CSS embebido.
   - Ver `docs/lessons-learned/book-export-pdf-print-surface.md`.
5. Si `printToPDF` falla con márgenes: no pasar márgenes en pulgadas **y** `@page` a la vez; el motor actual usa solo `@page` + `preferCSSPageSize: true`.
6. Tests focalizados: `npm run test -- tests/book-export`
7. Tras cambiar CSS: `npm run build:electron` (copia `book-export-pdf-print.css` a `dist-electron`).
8. Síntomas comunes (márgenes, página en blanco): `docs/live/troubleshooting.md` §14.

---

## Modelo de Datos

### `BookExportChapter`

```typescript
interface BookExportChapter {
  path: string        // ruta relativa al documento en el libro
  title: string       // título extraído del nombre de archivo
  content: string     // markdown sanitizado (sin frontmatter)
}
```

---

## Imágenes en DOCX

**Reference-style e inline**:
- Se detectan tanto `![alt](url)` como `![][ref]` / `![alt][ref]` / `![ref]`
- Las referencias se extraen una sola vez por capítulo (`extractImageReferences`)
- Las líneas de definición `[ref]: url` se omiten del output

**Imágenes inline dentro de párrafos**:
- Líneas con formato `texto ![](img.png) más texto` se procesan como `paragraph-with-images`
- El renderer crea párrafos con children mixtos: `TextRun` para texto, `ImageRun` para imágenes
- Cada segmento de texto se envuelve en `TextRun`, cada imagen en `ImageRun`, todos dentro del mismo `Paragraph`

**Dimensiones**:
- Se leen los bytes reales del PNG/JPEG (`getImageDimensions`)
- Se calcula tamaño en **píxeles** (no EMU) limitando a 600×800 px máximo
- Se preserva el aspect ratio; imágenes pequeñas no se escalan hacia arriba
- Fallback: 500×300 px cuando no se pueden leer las dimensiones

**Nota de implementación**: la librería `docx` recibe `transformation` en píxeles y convierte internamente a EMU. Pasar EMU directamente produce imágenes gigantescas o invisibles en lectores como LibreOffice y Calibre.

---

## Metadata (title / author) por formato

| Formato | ¿Recibe metadata? | Uso |
|---------|-------------------|-----|
| `html` | Sí | `<title>`, `<meta name="author">`, header con byline |
| `docx` | Sí | `Document.title`, `Document.creator` |
| `epub` | Sí | `EpubOptions.title`, `EpubOptions.author` |
| `pdf` | Sí (opcional) | Header en segmento 0 solo si `title` y/o `author`; sin título por defecto. Segmentos siguientes sin repetir header. Metadatos XMP PDF pendiente. |
| `markdown` | No | Concatenación simple, sin metadatos de libro |

---

## Tests de Regresión

`tests/book-export-renderers.test.ts` cubre:
- Unicode en PDF (acentos, caracteres no-Latin)
- Pagebreak + variante HTML (`<!-- pagebreak -->`)
- Data URLs en PDF (base64 embebido)
- Imágenes locales en PDF
- Imágenes persistidas `res/*.png` en PDF desde capítulos anidados
- Imágenes reference-style en PDF
- Center directives en headings y párrafos
- Heading levels en DOCX
- Imágenes reference-style en DOCX (data URL y local path)
- Imágenes reference-style en EPUB (data URL y local path)
- Imágenes inline dentro de párrafos en EPUB

`tests/book-export-image-utils.test.ts` cubre:
- Lectura de dimensiones PNG/JPEG desde bytes
- Cálculo de tamaño DOCX con preservación de aspect ratio y límites
- Extracción de referencias markdown
- Detección de líneas de definición de referencia

---

## Formato de Salida por Renderer

| Formato | Motor | Notas |
|---------|-------|-------|
| `markdown` | concatenación | Directivas removidas del output |
| `html` | marked + template | Directivas convertidas a CSS classes |
| `docx` | `docx` package | Heading styles, pagebreak como 2 líneas en blanco, imágenes reference-style + inline via `ImageRun` con dimensiones reales (píxeles, no EMU) |
| `epub` | `epub-gen` | Data URLs materializadas a archivos temporales con path `file://`; imágenes reference-style + inline |
| `pdf` | Chromium `printToPDF` + `pdf-lib` merge | Segmentos HTML, Times New Roman, ver ADR 0004 |

---

## Inline emphasis (bold / italic)

| Formato | Motor inline |
|---------|----------------|
| `html`, `epub`, `pdf` | `marked.parse()` en el contenido del capítulo/segmento |
| `docx` | `book-export-inline-markdown.ts` → `marked.lexer()` por línea |

Soporta `**bold**`, `__bold__`, `*italic*`, `_italic_` (incl. frases con espacios), enlaces (texto visible), y HTML legacy `<strong>` / `<em>` convertido antes del lexer.

DOCX aplica `TextRun` con `bold` / `italics` por run. Headings sin marcadores inline se renderizan en negrita por defecto; si el título trae `*...*` o `_..._`, se respeta el estilo inline.

## Errores Comunes Documentados

- **`WinAnsi cannot encode`** (pdf-lib layout retirado): el PDF actual usa Chromium; si falla la codificación, revisar fuentes del SO / CSS de impresión.
- **Data URL corrompida**: `path.resolve()` aplicado a `data:image/...` → ruta absoluta inválida. Fix: check `startsWith('data:image/')` antes de path resolution.
- **Center regression**: `drawHeading()` no recibía `centered` flag → headings ignoraban directivas de centrado. Fix: pasó `centered` a `drawHeading()` y calculó `x` igual que párrafos.
- **Imágenes reference-style ignoradas en DOCX**: el renderer solo parseaba `![alt](url)`, por lo que `![][ref]` + `[ref]: url` se renderizaba como texto plano. Fix: `extractImageReferences` + `extractImageInfo` soportan inline, explicit-ref e implicit-ref; las líneas de definición se skippean.
- **DOCX ImageRun con EMU en lugar de píxeles**: pasar EMU directamente a `transformation` produce imágenes gigantescas (página entera en Calibre) o invisibles (LibreOffice). Fix: `calculateDocxImageSize` retorna píxeles; la librería `docx` hace la conversión interna a EMU.
- **Énfasis inline con guiones bajos visibles en DOCX**: regex `_([^_]+)_` no cubre `_texto con espacios_`. Fix: parser compartido `book-export-inline-markdown.ts` basado en `marked.lexer`. PDF usa `marked.parse()` en el segmento.
- **Página en blanco al inicio del PDF (portada)**: ver lección `book-export-pdf-print-surface.md` — causas típicas: `<p>` alrededor de `<img>`, imagen más alta que el área imprimible, o pagebreak HTML residual dentro del segmento.

---

## Para Agregar un Nuevo Formato

1. Crear `book-export-{formato}-renderer.ts` en `electron/services/`
2. Implementar interfaz: `render{Formato}Book(chapters: BookExportChapter[], metadata, projectRoot): Promise<Uint8Array | string>`
3. Agregar import + case en `book-export-service.ts` (switch sobre `request.format`)
4. Agregar tests de regresión en `tests/book-export-renderers.test.ts`
5. Agregar entrada en `docs/live/file-map.md`
6. Si el renderer excede 200 líneas → splitear como se hizo con el PDF renderer
7. Aplicar **inter-document gap** entre documentos corkboard salvo author page break al final del documento anterior

