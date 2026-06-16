export type LayoutDirectiveEmbedType = 'center' | 'spacer' | 'pagebreak' | 'broken-image' | 'unknown'

export interface LayoutDirectiveEmbedValue {
  directive: LayoutDirectiveEmbedType
  role?: 'start' | 'end'
  lines?: number
  alt?: string
  source?: string
  raw?: string
}

export const LAYOUT_DIRECTIVE_BLOT_NAME = 'trama-directive'

export interface SelectionRange {
  index: number
  length: number
}

export type CenterDeleteDirection = 'backspace' | 'delete'

export interface CenterBoundary {
  index: number
  role: 'start' | 'end'
}

export interface CenterSegment {
  startBoundaryIndex: number
  endBoundaryIndex: number
  contentStartIndex: number
  contentEndIndexExclusive: number
}

export interface LineRange {
  startIndex: number
  endIndexExclusive: number
}
