# Markdown Layout Directives Specification (Invisible Markers)

Status: Draft v1  
Last updated: 2026-04-12

Implementation guide: `docs/done/markdown-layout-directives-implementation-plan.md`

## 1. Goal

Define a portable way to represent layout intent in Markdown for:

- Extra vertical spacing
- Page breaks
- Centered content blocks

The markers must be invisible in renderers that do not support them and safe for downstream export pipelines.

## 2. Design Principles

1. Source-first: Markdown remains readable and editable as plain text.
2. Invisible fallback: unsupported renderers must ignore markers without visual artifacts.
3. Semantic intent: markers describe meaning (center/page break/spacer), not presentation-specific HTML.
4. Multi-format export: mapping defined for HTML, PDF, EPUB, and MOBI workflows.

## 3. Chosen Syntax

Use HTML comments as semantic directives.

Rationale:

- Most Markdown renderers ignore comments visually.
- They do not alter normal text flow in unsupported environments.
- They are easy to parse reliably before conversion.

### 3.1 Directive Catalog

#### Center block

```md
<!-- trama:center:start -->
Content to be centered.
<!-- trama:center:end -->
```

#### Spacer (blank lines/vertical rhythm)

```md
<!-- trama:spacer lines=2 -->
```

#### Page break

```md
<!-- trama:pagebreak -->
```

## 4. Grammar (v1)

Directive comments are case-sensitive and must match exactly.

### 4.1 Center

- Start token: `<!-- trama:center:start -->`
- End token: `<!-- trama:center:end -->`
- Nesting: not allowed in v1.
- Unclosed block: treated as plain text comment markers (no transformation).

### 4.2 Spacer

- Token: `<!-- trama:spacer lines=N -->`
- `N` must be integer in range `[1, 12]`.
- Invalid or missing `N`: fallback to `N = 1` and emit warning.

### 4.3 Page break

- Token: `<!-- trama:pagebreak -->`
- Inline attributes: none in v1.

Important for v1: directive metadata is not part of Markdown syntax. Markdown directives remain canonical and minimal.

## 5. Parser and Pipeline Rules

### 5.1 Parse Stage Order (critical)

Directives must be parsed in a pre-processing stage before any converter/sanitizer that might strip HTML comments.

Recommended order:

1. Read source Markdown.
2. Parse Trama directives into internal semantic nodes.
3. Remove directive comments from source stream.
4. Continue normal Markdown-to-target conversion.
5. Inject target-specific output from semantic nodes.

### 5.2 Internal Semantic Nodes

The pre-processor should emit neutral nodes:

- `layout.center.start`
- `layout.center.end`
- `layout.spacer { lines: number }`
- `layout.pagebreak`

These nodes are format-agnostic and should be consumed by each exporter backend.

## 5.3 Editor Integration (Quill)

This project uses Quill as the rich editor and currently converts:

- Markdown -> HTML when loading (`marked`)
- HTML -> Markdown when serializing (`turndown`)

HTML comments are not guaranteed to survive this round-trip unless explicitly handled.

Required behavior for v1:

1. Directive comments are parsed from source Markdown before injecting content into Quill.
2. Center/spacer/pagebreak are represented in-editor as semantic editor artifacts (for example, custom blots or non-editable block markers), not as visible raw comment text.
3. Markdown serialization from Quill must re-emit directive comments exactly in canonical form.
4. If the editor cannot preserve a directive during an operation, it must not silently drop it; emit warning and keep source-level directive whenever possible.
5. Page break must be represented as a single atomic editor object (single cursor step across it).
6. During Markdown -> HTML conversion for Quill, generated HTML must include machine-readable data attributes identifying directive type.

Page break editor UX (required):

- Visual: render a tall separator placeholder (equivalent to multiple blank lines) so the author perceives a page transition.
- Interaction: cursor traversal treats the whole page break as one object (enter/exit in one step, not per visual line).
- Editing: backspace/delete removes the whole page break object, not partial visual fragments.
- Serialization: object maps back to one directive comment token.

Recommended implementation model:

- Pre-pass: `extractDirectives(markdown) -> { markdownWithoutDirectives, directives[] }`
- Editor model: attach directives to block anchors or dedicated embed nodes.
- Serialize: `quillState + directives -> markdownWithDirectives`

Quill internal HTML metadata contract (required):

- Use `data-trama-directive` to identify object type.
- Optional helper attributes:
  - `data-trama-lines` for spacer size
  - `data-trama-role` for internal role (`start`/`end` for center boundaries)

Reference HTML shape examples (editor-internal):

```html
<div class="trama-center-boundary" data-trama-directive="center" data-trama-role="start"></div>
<div class="trama-spacer" data-trama-directive="spacer" data-trama-lines="2"></div>
<div class="trama-pagebreak" data-trama-directive="pagebreak" contenteditable="false"></div>
<div class="trama-center-boundary" data-trama-directive="center" data-trama-role="end"></div>
```

Turndown/export serialization must use these attributes to reconstruct canonical Markdown directives.

## 5.4 Copy as Markdown (Context Menu)

The workspace command `copy-as-markdown` must include layout directives in copied output.

Rules:

1. If current document contains Trama directives, clipboard Markdown must preserve them.
2. Output must use canonical tokens (`trama:center:start`, `trama:center:end`, `trama:spacer`, `trama:pagebreak`).
3. Normalization can adjust line endings (`CRLF` to `LF`) but must not rewrite directive semantics.
4. No best-effort stripping: unknown `trama:` directives should remain unchanged in clipboard output.

Note: this requirement applies to the current `Copy as Markdown` command in the native editor context menu.

## 5.5 AI Export Integration

AI export currently copies file content from disk into `=== FILE: ... ===` blocks.

Required behavior for v1:

1. Layout directives are included as-is in exported text.
2. `includeFrontmatter` only affects YAML frontmatter, not Trama directives in body content.
3. Export must not sanitize or remove HTML comments matching `trama:*`.

Implication:

- If a document saved on disk contains directives, AI export and downstream LLM workflows receive those directives verbatim.

## 6. Rendering/Export Mapping

## 6.1 HTML

- Center block: wrap segment in `<div class="trama-center">...</div>`
- Spacer: `<div class="trama-spacer trama-spacer-N" aria-hidden="true"></div>`
- Page break: `<hr class="trama-pagebreak" />`

Suggested CSS:

```css
.trama-center { text-align: center; }
.trama-pagebreak {
  border: 0;
  margin: 0;
  break-after: page;
  page-break-after: always;
}
.trama-spacer { display: block; }
.trama-spacer-1 { min-height: 1lh; }
.trama-spacer-2 { min-height: 2lh; }
.trama-spacer-3 { min-height: 3lh; }
```

## 6.2 PDF

- Use the HTML/CSS mapping above in print mode.
- Ensure `break-after: page` and legacy `page-break-after: always` are both emitted for compatibility.

## 6.3 EPUB

- Center: output XHTML with `class="trama-center"` and CSS `text-align:center`.
- Page break: output dedicated pagebreak element with EPUB-compatible semantics:

```html
<div class="trama-pagebreak" epub:type="pagebreak" aria-label="Page Break"></div>
```

- Spacer: map to `<div class="trama-spacer trama-spacer-N"></div>`.
- Add all classes to the EPUB stylesheet packaged in the book.

## 6.4 MOBI

MOBI should be produced through EPUB conversion (recommended workflow):

`Markdown -> semantic transform -> EPUB -> MOBI/AZW3/KFX converter`

Notes:

- Treat EPUB as canonical source for Kindle-targeted outputs.
- Converter behavior varies by tool/version; keep class names simple and avoid advanced CSS dependencies.
- Prefer structural markers (`epub:type`, simple block elements) over complex styling.

## 7. Behavior in Unsupported Renderers

- Comments remain invisible.
- Content remains fully readable.
- No raw visible control syntax like `:::center` appears.

This is the required graceful degradation behavior for v1.

## 8. Validation Rules and Warnings

Implement non-fatal warnings:

1. `center:end` without matching `center:start`.
2. Nested center blocks.
3. `spacer lines` out of range.
4. Unknown `trama:` directive.

Warnings should include file path and line number when available.

## 9. Example (Authoring)

```md
# Chapter 1

<!-- trama:center:start -->
*This text will be italic*  
_This will also be italic_

**This text will be bold**  
__This will also be bold__
<!-- trama:center:end -->

Paragraph before page transition.

<!-- trama:spacer lines=2 -->

<!-- trama:pagebreak -->

# Chapter 2
```

## 10. Acceptance Criteria (v1)

1. In plain Markdown renderers with no Trama support, directives are invisible and content remains readable.
2. In Trama-supported rendering, centered block content is visually centered.
3. Spacer directive adds predictable vertical space.
4. Pagebreak directive creates a new page in PDF and EPUB exports.
5. EPUB output validates and retains semantic page break marker.
6. MOBI output generated from EPUB preserves practical page split behavior in Kindle-compatible readers.
7. Copy as Markdown includes Trama directives present in the current document.
8. AI export includes Trama directives in copied `=== FILE: ... ===` output.
9. Page break appears in-editor as a tall separator but behaves as one atomic cursor object.

## 11. Non-Goals (v1)

- Arbitrary alignment options (`left/right/justify`).
- Nested layout containers.
- Pixel-precise spacing units.
- Guaranteeing identical pagination across all EPUB/MOBI readers.
