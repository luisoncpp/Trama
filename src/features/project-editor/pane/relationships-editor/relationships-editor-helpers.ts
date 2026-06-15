import type { RelationshipEdge, RelationshipNode } from './relationships-editor-types'

export type { RelationshipEdge, RelationshipEdgePreset, RelationshipNode, RelationshipsConfig, RelationshipEdgeStyle, RelationshipEdgeDirection } from './relationships-editor-types'
export { getRelationshipsConfig, withRelationshipsConfig, DEFAULT_NODE_COLOR, DEFAULT_EDGE_COLOR } from './relationships-config-serialization'
export { clampMapValue as clampChartValue, resolveMarkerDestination as resolveNodeDestination } from '../map-editor/map-editor-helpers'

export const RELATIONSHIPS_STAGE_WIDTH = 2400
export const RELATIONSHIPS_STAGE_HEIGHT = 1600

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

const NODE_ANCHOR_RADIUS = 26

function shortenTowards(fromX: number, fromY: number, toX: number, toY: number, distance: number): { x: number; y: number } {
  const deltaX = toX - fromX
  const deltaY = toY - fromY
  const length = Math.hypot(deltaX, deltaY)
  if (length === 0) return { x: fromX, y: fromY }
  const ratio = Math.min(distance / length, 0.4)
  return { x: fromX + deltaX * ratio, y: fromY + deltaY * ratio }
}

export function buildEdgeGeometry(from: RelationshipNode, to: RelationshipNode, parallelIndex: number): EdgeGeometry {
  const start = shortenTowards(from.x, from.y, to.x, to.y, NODE_ANCHOR_RADIUS)
  const end = shortenTowards(to.x, to.y, from.x, from.y, NODE_ANCHOR_RADIUS)
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
