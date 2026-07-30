// @Architecture(descriptionShort="Public facade re-exporting module surface")
export {
  parseDocumentHeadings,
  type DocumentHeading,
  type DocumentHeadingType,
  type ParseDocumentHeadingsOptions,
} from './private/document-headings-parser.js'
export { setMarkdownLayoutDirectiveLabel } from './private/document-layout-label.js'
export {
  computeCenteredScrollTop,
  revealQuillHeading,
  scanQuillHeadings,
  type QuillDocumentHeading,
  type ScanQuillHeadingsOptions,
} from './private/quill-heading-reveal.js'
// Declared in project-editor-types.ts so the Electron build graph
// (src/shared → project-editor-types) never pulls Quill/DOM types.
export type { HeadingRevealTarget } from '../project-editor-types.js'
