// @Architecture(descriptionShort="Pure helper functions for adjacent UI or domain logic")
import type { RelationshipEdge, RelationshipNode, RelationshipRegion } from './relationships-editor-types'

export type { RelationshipEdge, RelationshipEdgePreset, RelationshipNode, RelationshipRegion, RelationshipsConfig, RelationshipEdgeStyle, RelationshipEdgeDirection } from './relationships-editor-types'
export { getRelationshipsConfig, withRelationshipsConfig, DEFAULT_NODE_COLOR, DEFAULT_EDGE_COLOR, DEFAULT_REGION_COLOR, normalizeEmojis, MAX_NODE_EMOJIS, MAX_EMOJI_CODE_POINTS } from './relationships-config-serialization'
import { clampMapValue } from '../../map-editor/map-editor-helpers'

export { clampMapValue as clampChartValue, resolveMarkerDestination as resolveNodeDestination } from '../../map-editor/map-editor-helpers'

export const RELATIONSHIPS_STAGE_MIN_X = -2400
export const RELATIONSHIPS_STAGE_MIN_Y = -1600
export const RELATIONSHIPS_STAGE_MAX_X = 2400
export const RELATIONSHIPS_STAGE_MAX_Y = 1600
/** Visible stage size in the editor (logical origin stays at top-left of this box). */
export const RELATIONSHIPS_STAGE_WIDTH = 2400
export const RELATIONSHIPS_STAGE_HEIGHT = 1600
/** Full logical span used by the SVG layers so negative node coordinates render. */
export const RELATIONSHIPS_STAGE_SPAN_WIDTH = RELATIONSHIPS_STAGE_MAX_X - RELATIONSHIPS_STAGE_MIN_X
export const RELATIONSHIPS_STAGE_SPAN_HEIGHT = RELATIONSHIPS_STAGE_MAX_Y - RELATIONSHIPS_STAGE_MIN_Y

export function clampNodePosition(x: number, y: number): { x: number; y: number } {
  return {
    x: clampMapValue(x, RELATIONSHIPS_STAGE_MIN_X, RELATIONSHIPS_STAGE_MAX_X),
    y: clampMapValue(y, RELATIONSHIPS_STAGE_MIN_Y, RELATIONSHIPS_STAGE_MAX_Y),
  }
}

export function resolveAutoNodeTag(label: string, tagIndex: Record<string, string> | null): string {
  if (!tagIndex) return ''
  const normalizedTag = label.trim().toLowerCase().replace(/^#/, '')
  return normalizedTag && tagIndex[normalizedTag] !== undefined ? normalizedTag : ''
}

export const RELATIONSHIPS_REGION_MIN_WIDTH = 80
export const RELATIONSHIPS_REGION_MIN_HEIGHT = 60
export const RELATIONSHIPS_DEFAULT_REGION_WIDTH = 320
export const RELATIONSHIPS_DEFAULT_REGION_HEIGHT = 200

export function buildRegionId(label: string, existingIds: Iterable<string>): string {
  return buildNodeId(label || 'region', existingIds)
}

export function rectFromDragCorners(x1: number, y1: number, x2: number, y2: number): { x: number; y: number; width: number; height: number } {
  const left = Math.min(x1, x2)
  const top = Math.min(y1, y2)
  const width = Math.abs(x2 - x1)
  const height = Math.abs(y2 - y1)
  return clampRegionRect(left, top, width, height)
}

export function clampRegionRect(x: number, y: number, width: number, height: number): { x: number; y: number; width: number; height: number } {
  const clampedWidth = Math.max(RELATIONSHIPS_REGION_MIN_WIDTH, width)
  const clampedHeight = Math.max(RELATIONSHIPS_REGION_MIN_HEIGHT, height)
  const maxX = RELATIONSHIPS_STAGE_MAX_X - clampedWidth
  const maxY = RELATIONSHIPS_STAGE_MAX_Y - clampedHeight
  return {
    x: clampMapValue(x, RELATIONSHIPS_STAGE_MIN_X, maxX),
    y: clampMapValue(y, RELATIONSHIPS_STAGE_MIN_Y, maxY),
    width: clampedWidth,
    height: clampedHeight,
  }
}

export function clampRegionPosition(region: Pick<RelationshipRegion, 'x' | 'y' | 'width' | 'height'>): { x: number; y: number } {
  const maxX = RELATIONSHIPS_STAGE_MAX_X - region.width
  const maxY = RELATIONSHIPS_STAGE_MAX_Y - region.height
  return {
    x: clampMapValue(region.x, RELATIONSHIPS_STAGE_MIN_X, maxX),
    y: clampMapValue(region.y, RELATIONSHIPS_STAGE_MIN_Y, maxY),
  }
}

export function buildNodeId(label: string, existingIds: Iterable<string>): string {
  const taken = new Set(existingIds)
  const slug = label
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'character'
  if (!taken.has(slug)) return slug
  for (let suffix = 2; ; suffix += 1) {
    const candidate = `${slug}-${suffix}`
    if (!taken.has(candidate)) return candidate
  }
}

export function getEdgeDashArray(style: RelationshipEdge['style']): string | undefined {
  if (style === 'dashed') return '10 6'
  if (style === 'dotted') return '2 5'
  return undefined
}

export interface EdgeGeometry {
  path: string
  labelX: number
  labelY: number
}

// Matches `.relationships-node` pill layout: dot, gap, horizontal padding, border.
const NODE_PILL_FIXED_WIDTH = 10 + 7 + 24 + 4
const NODE_PILL_CHAR_WIDTH = 7.2
const NODE_PILL_HALF_HEIGHT = 15

export function estimateNodeHalfExtents(label: string): { halfWidth: number; halfHeight: number } {
  return {
    halfWidth: (NODE_PILL_FIXED_WIDTH + label.length * NODE_PILL_CHAR_WIDTH) / 2,
    halfHeight: NODE_PILL_HALF_HEIGHT,
  }
}

function anchorOnNodeBoundary(node: RelationshipNode, targetX: number, targetY: number): { x: number; y: number } {
  const { halfWidth, halfHeight } = estimateNodeHalfExtents(node.label)
  const deltaX = targetX - node.x
  const deltaY = targetY - node.y
  const absX = Math.abs(deltaX)
  const absY = Math.abs(deltaY)
  if (absX === 0 && absY === 0) return { x: node.x, y: node.y }

  let scale: number
  if (absX === 0) {
    scale = halfHeight / absY
  } else if (absY === 0) {
    scale = halfWidth / absX
  } else {
    scale = Math.min(halfWidth / absX, halfHeight / absY)
  }

  return { x: node.x + deltaX * scale, y: node.y + deltaY * scale }
}

export function buildEdgeGeometry(from: RelationshipNode, to: RelationshipNode, parallelIndex: number): EdgeGeometry {
  const start = anchorOnNodeBoundary(from, to.x, to.y)
  const end = anchorOnNodeBoundary(to, from.x, from.y)
  const midX = (start.x + end.x) / 2
  const midY = (start.y + end.y) / 2
  const length = Math.hypot(end.x - start.x, end.y - start.y) || 1
  // Parallel edges between the same pair bow out on alternating sides so each stays visible.
  const bend = parallelIndex === 0 ? 0 : Math.ceil(parallelIndex / 2) * 36 * (parallelIndex % 2 === 1 ? 1 : -1)
  const normalX = -(end.y - start.y) / length
  const normalY = (end.x - start.x) / length
  const controlX = midX + normalX * bend
  const controlY = midY + normalY * bend
  return {
    path: `M ${start.x} ${start.y} Q ${controlX} ${controlY} ${end.x} ${end.y}`,
    labelX: midX + normalX * bend * 0.5,
    labelY: midY + normalY * bend * 0.5 - 6,
  }
}

export function getParallelEdgeIndex(edges: RelationshipEdge[], edgeIndex: number): number {
  const edge = edges[edgeIndex]
  const pairKey = [edge.from, edge.to].sort().join('::')
  let position = 0
  for (let index = 0; index < edgeIndex; index += 1) {
    if ([edges[index].from, edges[index].to].sort().join('::') === pairKey) position += 1
  }
  return position
}
