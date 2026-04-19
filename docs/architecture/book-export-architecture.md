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
├── book-export-image-utils.ts  — Resolve paths, carga bytes, parsea data URLs
│
├── book-export-renderers.ts    — Modelo común BookExportChapter + renderer HTML/Markdown
│
├── book-export-pdf-font-utils.ts      — normalizeForFont, safeTextForFont, normalizeRunsForFonts
├── book-export-pdf-utils.ts            — createPdfWriter, PdfWriter, PdfLayoutState, drawRuns, drawHeading, drawPdfImage, drawWrappedParagraph
├── book-export-pdf-chapters.ts         — renderPdfChapter: parsea contenido, emite al writer
├── book-export-pdf-renderer.ts         — BARRIL (3 líneas): re-exporta desde pdf-utils.ts
│
├── book-export-docx-renderer.ts — DOCX via `docx` package
├── book-export-epub-renderer.ts — EPUB via `epub-gen`
```

### Archivo barrel (`book-export-pdf-renderer.ts`)

Este archivo tiene 3 líneas. Existe para que los importers (`book-export-service.ts`) puedan importar desde `book-export-pdf-renderer.ts` sin conocer la split internamente. Si necesitas editar la implementación del PDF, edita `book-export-pdf-utils.ts`.

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
         │      ├── Limpia content (directivas parseadas en paso 1)
         │      ├── Por cada línea del contenido:
         │      │    ├── Detecta center/spacer/pagebreak
         │      │    ├── Si center-start → set state.centered = true
         │      │    ├── Si spacer → writer.addSpacer(n)
         │      │    ├── Si pagebreak → addPage() forzado
         │      │    ├── Si heading → writer.drawHeading(text, centered)
         │      │    └── Si párrafo → writer.drawParagraphLine(text, centered)
         │      │         └── drawParagraphLine usa wrapTokens + drawRuns
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

```
Sistema: Busca fuentes serif Unicode del sistema (Times New Roman / Nimbus Roman No 9 L)
         Si encuentra → Embed con @pdf-lib/fontkit (soporta Unicode completo)
         
Fallback: StandardFonts.TimesRoman (WinAnsi, no soporta Unicode extendido)

Lógica en book-export-pdf-fonts.ts:
  1. Intenta cargar fuente del sistema via fontkit
  2. Si falla → usa StandardFonts
  3. Ambos casos: crea objeto { regular, bold }
```

El fallback a `StandardFonts` puede fallar con caracteres no-WinAnsi (ej. acentos, eñe, caracteres cirílicos). Si el documento los usa y no hay fuente de sistema, el `safeTextForFont()` hace encoding fallbacks progresivos.

---

## Imágenes en PDF

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

## Tests de Regresión

`tests/book-export-renderers.test.ts` cubre:
- Unicode en PDF (acentos, caracteres no-Latin)
- Pagebreak + variante HTML (`<!-- pagebreak -->`)
- Data URLs en PDF (base64 embebido)
- Imágenes locales en PDF
- Center directives en headings y párrafos
- Heading levels en DOCX
- Imágenes en EPUB (data URL + local path con materialización a temp)

---

## Formato de Salida por Renderer

| Formato | Motor | Notas |
|---------|-------|-------|
| `markdown` | concatenación | Directivas removidas del output |
| `html` | marked + template | Directivas convertidas a CSS classes |
| `docx` | `docx` package | Heading styles, pagebreak como 2 líneas en blanco, imágenes via ImageRun |
| `epub` | `epub-gen` | Data URLs materializadas a archivos temporales con path `file://` |
| `pdf` | `pdf-lib` | Renderer dedicado, fuente Unicode embebida, layout state-driven |

---

## Errores Comunes Documentados

- **`WinAnsi cannot encode`**: Fuente del sistema no disponible → fallback a StandardFonts → falla en Unicode. Fix: asegurar que `@pdf-lib/fontkit` encuentra fuente serif del sistema.
- **Data URL corrompida**: `path.resolve()` aplicado a `data:image/...` → ruta absoluta inválida. Fix: check `startsWith('data:image/')` antes de path resolution.
- **Center regression**: `drawHeading()` no recibía `centered` flag → headings ignoraban directivas de centrado. Fix: pasó `centered` a `drawHeading()` y calculó `x` igual que párrafos.

---

## Para Agregar un Nuevo Formato

1. Crear `book-export-{formato}-renderer.ts` en `electron/services/`
2. Implementar interfaz: `render{Formato}Book(chapters: BookExportChapter[], metadata, projectRoot): Promise<Uint8Array | string>`
3. Agregar import + case en `book-export-service.ts` (switch sobre `request.format`)
4. Agregar tests de regresión en `tests/book-export-renderers.test.ts`
5. Agregar entrada en `docs/file-map.md`
6. Si el renderer excede 200 líneas → splitear como se hizo con el PDF renderer