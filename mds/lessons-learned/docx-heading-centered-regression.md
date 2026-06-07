# DOCX Heading Style + Centered Alignment Regression

Date: 2026-04-16

Problem:
Los headings de markdown (`# Heading`) no se exportaban con estilo de heading en DOCX, se renderizaban como texto plano. Después de agregar `createHeadingParagraph()`, los headings dentro de directivas `<!-- trama:center:start -->` perdieron la alineación centrada porque la función no recibía el parámetro `centered`.

Lesson:
Cuando se implementan estilos específicos para elementos semánticos (headings), hay que propagar el estado de layout (como centrado) a través de todas las funciones de rendering. Las correcciones de estilos no deben silenciosamente romper directivas de layout.

Fix:
1. Agregar `createHeadingParagraph(text, level, centered)` que aplica tanto el estilo de heading (`Heading1-Hex`) como la alineación centrada cuando corresponde.
2. Propagar el flag `centered` desde `processLine()` hasta `createHeadingParagraph()`.
3. Agregar pruebas de regresión en `tests/book-export-renderers.test.ts` para validar estilos de heading y alineación centrada en headings.

Files modified:
- `electron/services/book-export-docx-renderer.ts` - agregado soporte de heading y alineación

Tests added:
- `renders docx with Heading1 style for h1 markdown`
- `renders docx with centered alignment for headings inside center directives`
- `renders docx with multiple heading levels`