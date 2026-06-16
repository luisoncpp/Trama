import type Quill from 'quill'
import { registerLayoutDirectiveBlots } from './layout-directive-blots'
import { createLayoutDirectiveKeyboardBindings, handleCenterBoundaryDelete } from './layout-directive-keyboard'
import { registerLayoutDirectiveClipboardMatchers } from './layout-directive-clipboard'
import { syncCenteredLayoutArtifacts } from './layout-directive-centering'
import {
  insertPagebreakDirective,
  insertSpacerDirective,
  insertCenterDirectives,
  toggleCenterDirectives,
} from './layout-directive-actions'
import {
  extractCenterBoundariesFromOps,
  deriveCenterSegments,
  getCenterSegments,
  findCenterSegmentAtIndex,
  normalizeSelectionToLineRange,
  getLineStartIndex,
  getLineEndIndexExclusive,
} from './layout-directive-center-ranges'
import { LAYOUT_DIRECTIVE_BLOT_NAME } from './layout-directive-types'
import type { CenterSegment, SelectionRange, CenterDeleteDirection } from './layout-directive-types'

export class LayoutDirectiveController {
  static register(): void {
    registerLayoutDirectiveBlots()
  }

  static getKeyboardBindings(): ReturnType<typeof createLayoutDirectiveKeyboardBindings> {
    return createLayoutDirectiveKeyboardBindings()
  }

  static addClipboardMatchers(editor: Quill): void {
    registerLayoutDirectiveClipboardMatchers(editor)
  }

  static syncOnTextChange(editor: Quill): void {
    syncCenteredLayoutArtifacts(editor)
  }

  static handleCenterBoundaryDelete(
    editor: Quill,
    range: SelectionRange,
    direction: CenterDeleteDirection,
  ): boolean {
    return handleCenterBoundaryDelete(editor, range, direction)
  }

  static insertPagebreak(editor: Quill): void {
    insertPagebreakDirective(editor)
  }

  static insertSpacer(editor: Quill, lines = 1): void {
    insertSpacerDirective(editor, lines)
  }

  static insertCenter(editor: Quill): void {
    insertCenterDirectives(editor)
  }

  static toggleCenter(editor: Quill): void {
    toggleCenterDirectives(editor)
  }
}

export {
  LAYOUT_DIRECTIVE_BLOT_NAME,
  extractCenterBoundariesFromOps,
  deriveCenterSegments,
  getCenterSegments,
  findCenterSegmentAtIndex,
  normalizeSelectionToLineRange,
  getLineStartIndex,
  getLineEndIndexExclusive,
  type CenterSegment,
  type SelectionRange,
  type CenterDeleteDirection,
}
