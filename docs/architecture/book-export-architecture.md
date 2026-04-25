# Book Export - Arquitectura y Guía de Renderers

## Propósito

Este documento describe la arquitectura real de la exportación de libros en el codebase. Es la referencia canonical para entender cómo un capítulo Markdown se convierte en un archivo PDF (u otro formato).

---

## Arquitectura de Archivos

```
book-export-service.ts          — Orquestador: compila capítulos, sanitiza, dispatch por formato
├── book-export-order.ts        — Ordena archivos por índice corkboardOrder
├── book-export-sanitize.ts     — Elimina frontmatter, normaliza saltos
├── book-export-directives.ts   — Parsea directivas layout (center/spacer/pagebreak)
├── book-export-image-utils.ts  — Resolve paths, carga bytes, parsea data URLs, lee dimensiones PNG/JPEG, escala para DOCX, extrae referencias markdown
│
├── book-export-renderers.ts    — Modelo común BookExportChapter + renderer HTML/Markdown
│
├── book-export-pdf-fonts.ts           — Carga fuentes del sistema (Times New Roman, etc.) vía @pdf-lib/fontkit; fallback a StandardFonts
├── book-export-pdf-font-utils.ts      — Normalización Unicode: normalizeForFont, safeTextForFont, normalizeRunsForFonts
├── book-export-pdf-inline.ts          — Tokeniza inline bold (**text**) y word-wrap para layout PDF
├── book-export-pdf-utils.ts            — createPdfWriter, PdfWriter, PdfLayoutState, drawRuns, drawHeading, drawPdfImage, drawWrappedParagraph
├── book-export-pdf-chapters.ts         — renderPdfChapter: parsea contenido (directivas, imágenes, headings, párrafos), emite al writer
├── book-export-pdf-renderer.ts         — BARRIL (2 líneas): re-exporta desde pdf-utils.ts
│
├── book-export-docx-renderer.ts — DOCX via `docx` package
├── book-export-epub-renderer.ts — EPUB via `epub-gen`
```

### Archivo barrel (`book-export-pdf-renderer.ts`)

Este archivo tiene 2 líneas. Existe para que los importers (`book-export-service.ts`) puedan importar desde `book-export-pdf-renderer.ts` sin conocer la split internamente. Si necesitas editar la implementación del PDF, edita `book-export-pdf-utils.ts`.

---

## Pipeline de Render PDF

```
Input: BookExportChapter[]  (path, title, content sanitizado)
         │
         ▼
renderPdfBook()   [book-export-pdf-utils.ts]
         │
         ├── Crea PDFDocument + PdfLayoutState (cursorY, centered)
         │
         ├── Itera capítulos:
         │      │
         │      ▼
          │   renderPdfChapter()  [book-export-pdf-chapters.ts]
          │      │
          │      ├── Limpia content (directivas ya parseadas en sanitize)
          │      ├── Por cada línea del contenido:
          │      │    ├── Detecta directivas: center/spacer/pagebreak
          │      │    ├── Si center-start → set state.centered = true
          │      │    ├── Si spacer → writer.addSpacer(n)
          │      │    ├── Si pagebreak → addPage() forzado
          │      │    ├── Si línea de imagen (![alt](path)) → writer.drawImage(resolvedPath)
          │      │    ├── Si heading → writer.drawHeading(text, centered)
          │      │    └── Si párrafo → writer.drawParagraphLine(text, centered)
          │      │         └── drawParagraphLine usa inlineTokens → wrapTokens → drawRuns
          │      │
          │      └── Retorna si último elemento fue pagebreak
         │
         └── pdf.save() → Uint8Array
```

---

## Modelo de Datos

### `BookExportChapter`

```typescript
interface BookExportChapter {
  path: string        // ruta relativa al capítulo
  title: string       // título extraído del nombre de archivo
  content: string     // markdown sanitizado (sin frontmatter)
}
```

### `PdfWriter`

```typescript
interface PdfWriter {
  addPage: () => void
  drawHeading: (text: string, centered: boolean) => void
  drawParagraphLine: (text: string, centered: boolean) => void
  addSpacer: (lines: number) => void
  drawImage: (absolutePath: string) => Promise<void>
}
```

### `PdfLayoutState`

```typescript
interface PdfLayoutState {
  cursorY: number     // posición Y actual del cursor
  centered: boolean   // si el contenido siguiente debe estar centrado
}
```

---

## Directivas Layout en PDF

El parser de directivas (`book-export-directives.ts`) extrae del markdown los directivas `trama:*` y las convierte en llamadas al `PdfWriter`:

| Directiva | Implementación PDF |
|-----------|-------------------|
| `<!-- trama:center:start -->` | `state.centered = true` antes del siguiente contenido |
| `<!-- trama:center:end -->` | `state.centered = false` después del bloque centrado |
| `<!-- trama:spacer lines=N -->` | `writer.addSpacer(N)` — mueve cursor N líneas |
| `<!-- trama:pagebreak -->` | `writer.addPage()` + `addPage()` forzado |
| `<!-- pagebreak -->` (HTML variant) | Mismo comportamiento que `trama:pagebreak` |

El renderer PDF NO usa HTML comentarios como output intermediario — las directivas se consumen durante el parseo y se traducen directamente a operaciones de layout (`addPage`, `addSpacer`, `cursorY` adjustments).

---

## Fuentes PDF

Hay **dos archivos** relacionados con fuentes; no confundir:

### `book-export-pdf-fonts.ts` — Carga de fuentes del sistema
```
Sistema: Busca fuentes serif Unicode del sistema (Times New Roman / Nimbus Roman No 9 L)
         Si encuentra → Embed con @pdf-lib/fontkit (soporta Unicode completo)
         
Fallback: StandardFonts.TimesRoman (WinAnsi, no soporta Unicode extendido)

Pasos:
  1. Itera candidatos de sistema por plataforma (Windows, macOS, Linux)
  2. Intenta cargar vía fontkit; si falla → usa StandardFonts
  3. Retorna objeto { regular: PDFFont, bold: PDFFont }
```

### `book-export-pdf-font-utils.ts` — Normalización de texto para encoding
- `normalizeForFont()`: elimina diacríticos (NFKD), reemplaza comillas tipográficas, etc.
- `safeTextForFont()`: prueba `font.encodeText()`; si falla, aplica normalización progresiva hasta `[^\x20-\x7E]` → `?`
- `normalizeRunsForFonts()`: aplica `safeTextForFont()` a cada token de un run (regular/bold)

El fallback a `StandardFonts` puede fallar con caracteres no-WinAnsi (ej. acentos, eñe, caracteres cirílicos). Si el documento los usa y no hay fuente de sistema, `safeTextForFont()` hace encoding fallbacks progresivos.

---

## Imágenes en PDF

**Reference-style e inline**:
- Se detectan tanto `![alt](url)` como `![][ref]` / `![alt][ref]` / `![ref]`
- Las referencias se extraen una sola vez por capítulo (`extractImageReferences`)
- Las líneas de definición `[ref]: url` se omiten del output

**Data URLs (base64)**:
- Detectadas por prefijo `data:image/`
- NO pasan por `path.resolve()` — se parsean directamente
- Se decodifican a bytes y se embed via `pdf.embedPng()` o `pdf.embedJpg()`

**Archivos locales**:
- `path.resolve(projectRoot, chapterDir, imagePath)` → ruta absoluta
- `loadImageBytes()` → { type, bytes }
- `embedPng` o `embedJpg` según el tipo

**Escalado**:
```
scale = min(
  (PAGE_WIDTH - MARGIN*2) / image.width,
  300 / image.height,
  1
)
```
Restricciones: no más ancho que el área printable, no más alto que 300px, sin escalar si ya es menor.

---

## Imágenes en DOCX

**Reference-style e inline**:
- Se detectan tanto `![alt](url)` como `![][ref]` / `![alt][ref]` / `![ref]`
- Las referencias se extraen una sola vez por capítulo (`extractImageReferences`)
- Las líneas de definición `[ref]: url` se omiten del output

**Dimensiones**:
- Se leen los bytes reales del PNG/JPEG (`getImageDimensions`)
- Se calcula tamaño en **píxeles** (no EMU) limitando a 600×800 px máximo
- Se preserva el aspect ratio; imágenes pequeñas no se escalan hacia arriba
- Fallback: 500×300 px cuando no se pueden leer las dimensiones

**Nota de implementación**: la librería `docx` recibe `transformation` en píxeles y convierte internamente a EMU. Pasar EMU directamente produce imágenes gigantescas o invisibles en lectores como LibreOffice y Calibre.

---

## Métricas de Página

```
PAGE_WIDTH  = 595   // puntos (A4 ≈ 595 × 842)
PAGE_HEIGHT = 842
MARGIN      = 50    // puntos
BODY_FONT_SIZE = 12
HEADING_FONT_SIZE = 17
LINE_HEIGHT = 18

Línea nueva cuando cursorY < MARGIN → addPage() automático (ensureLineCapacity)
```

---

## Metadata (title / author) por formato

| Formato | ¿Recibe metadata? | Uso |
|---------|-------------------|-----|
| `html` | Sí | `<title>`, `<meta name="author">`, header con byline |
| `docx` | Sí | `Document.title`, `Document.creator` |
| `epub` | Sí | `EpubOptions.title`, `EpubOptions.author` |
| `pdf` | **No** | `renderPdfBook(chapters, projectRoot)` no recibe `BookExportMetadata`. La firma del orquestador (`book-export-service.ts`) pasa `projectRoot` pero no `metadata`. Generación de portada / metadatos XMP pendiente. |
| `markdown` | No | Concatenación simple, sin metadatos de libro |

---

## Tests de Regresión

`tests/book-export-renderers.test.ts` cubre:
- Unicode en PDF (acentos, caracteres no-Latin)
- Pagebreak + variante HTML (`<!-- pagebreak -->`)
- Data URLs en PDF (base64 embebido)
- Imágenes locales en PDF
- Imágenes reference-style en PDF
- Center directives en headings y párrafos
- Heading levels en DOCX
- Imágenes reference-style en DOCX (data URL y local path)
- Imágenes en EPUB (data URL + local path con materialización a temp)

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
| `epub` | `epub-gen` | Data URLs materializadas a archivos temporales con path `file://` |
| `pdf` | `pdf-lib` | Renderer dedicado, fuente Unicode embebida, layout state-driven; imágenes reference-style + inline; **no recibe metadata aún** (ver sección Metadata) |

---

## Errores Comunes Documentados

- **`WinAnsi cannot encode`**: Fuente del sistema no disponible → fallback a StandardFonts → falla en Unicode. Fix: asegurar que `@pdf-lib/fontkit` encuentra fuente serif del sistema.
- **Data URL corrompida**: `path.resolve()` aplicado a `data:image/...` → ruta absoluta inválida. Fix: check `startsWith('data:image/')` antes de path resolution.
- **Center regression**: `drawHeading()` no recibía `centered` flag → headings ignoraban directivas de centrado. Fix: pasó `centered` a `drawHeading()` y calculó `x` igual que párrafos.
- **Imágenes reference-style ignoradas en DOCX**: el renderer solo parseaba `![alt](url)`, por lo que `![][ref]` + `[ref]: url` se renderizaba como texto plano. Fix: `extractImageReferences` + `extractImageInfo` soportan inline, explicit-ref e implicit-ref; las líneas de definición se skippean.
- **DOCX ImageRun con EMU en lugar de píxeles**: pasar EMU directamente a `transformation` produce imágenes gigantescas (página entera en Calibre) o invisibles (LibreOffice). Fix: `calculateDocxImageSize` retorna píxeles; la librería `docx` hace la conversión interna a EMU.

---

## Para Agregar un Nuevo Formato

1. Crear `book-export-{formato}-renderer.ts` en `electron/services/`
2. Implementar interfaz: `render{Formato}Book(chapters: BookExportChapter[], metadata, projectRoot): Promise<Uint8Array | string>`
3. Agregar import + case en `book-export-service.ts` (switch sobre `request.format`)
4. Agregar tests de regresión en `tests/book-export-renderers.test.ts`
5. Agregar entrada en `docs/live/file-map.md`
6. Si el renderer excede 200 líneas → splitear como se hizo con el PDF renderer