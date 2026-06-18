import type { DocumentMeta } from '../../../../../shared/ipc'
import type {
  RelationshipEdge,
  RelationshipEdgeDirection,
  RelationshipEdgePreset,
  RelationshipEdgeStyle,
  RelationshipNode,
  RelationshipRegion,
  RelationshipsConfig,
} from './relationships-editor-types'

export const DEFAULT_NODE_COLOR = '#6ea6ff'
export const DEFAULT_EDGE_COLOR = '#e74c3c'
export const DEFAULT_REGION_COLOR = '#6b7b8c'

export const MAX_NODE_EMOJIS = 12
export const MAX_EMOJI_CODE_POINTS = 31

const EDGE_STYLES: readonly RelationshipEdgeStyle[] = ['solid', 'dashed', 'dotted']
const EDGE_DIRECTIONS: readonly RelationshipEdgeDirection[] = ['forward', 'both', 'none']

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function normalizeColor(value: unknown, fallback: string): string {
  return typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value.trim()) ? value.trim() : fallback
}

export function normalizeEmojis(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  const seen = new Set<string>()
  const out: string[] = []
  for (const item of value) {
    if (typeof item !== 'string') continue
    const trimmed = item.trim()
    if (!trimmed) continue
    if (Array.from(trimmed).length > MAX_EMOJI_CODE_POINTS) continue
    if (seen.has(trimmed)) continue
    seen.add(trimmed)
    out.push(trimmed)
    if (out.length >= MAX_NODE_EMOJIS) break
  }
  return out
}

function normalizeEdgeStyle(value: unknown): RelationshipEdgeStyle {
  return EDGE_STYLES.includes(value as RelationshipEdgeStyle) ? value as RelationshipEdgeStyle : 'solid'
}

function normalizeEdgeDirection(value: unknown): RelationshipEdgeDirection {
  return EDGE_DIRECTIONS.includes(value as RelationshipEdgeDirection) ? value as RelationshipEdgeDirection : 'forward'
}

function normalizeNode(value: unknown): RelationshipNode | null {
  if (!isRecord(value)) return null
  const id = typeof value.id === 'string' ? value.id.trim() : ''
  const x = typeof value.x === 'number' ? value.x : Number(value.x)
  const y = typeof value.y === 'number' ? value.y : Number(value.y)
  const label = typeof value.label === 'string' ? value.label.trim() : ''
  const destinationTag = typeof value.destinationTag === 'string' ? value.destinationTag.trim() : ''
  const description = typeof value.description === 'string' ? value.description.trim() : ''
  if (!id || !Number.isFinite(x) || !Number.isFinite(y) || !label) return null
  return {
    id,
    x,
    y,
    label,
    destinationTag,
    color: normalizeColor(value.color, DEFAULT_NODE_COLOR),
    description: description || undefined,
    emojis: normalizeEmojis(value.emojis),
  }
}

function normalizeEdge(value: unknown, nodeIds: Set<string>): RelationshipEdge | null {
  if (!isRecord(value)) return null
  const from = typeof value.from === 'string' ? value.from.trim() : ''
  const to = typeof value.to === 'string' ? value.to.trim() : ''
  const label = typeof value.label === 'string' ? value.label.trim() : ''
  if (!from || !to || from === to || !nodeIds.has(from) || !nodeIds.has(to)) return null
  return {
    from,
    to,
    label,
    color: normalizeColor(value.color, DEFAULT_EDGE_COLOR),
    style: normalizeEdgeStyle(value.style),
    direction: normalizeEdgeDirection(value.direction),
  }
}

function normalizeRegion(value: unknown): RelationshipRegion | null {
  if (!isRecord(value)) return null
  const id = typeof value.id === 'string' ? value.id.trim() : ''
  const x = typeof value.x === 'number' ? value.x : Number(value.x)
  const y = typeof value.y === 'number' ? value.y : Number(value.y)
  const width = typeof value.width === 'number' ? value.width : Number(value.width)
  const height = typeof value.height === 'number' ? value.height : Number(value.height)
  const label = typeof value.label === 'string' ? value.label.trim() : ''
  if (!id || !Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(width) || !Number.isFinite(height)) return null
  if (width < 40 || height < 32) return null
  return {
    id,
    x,
    y,
    width,
    height,
    label: label || 'Region',
    color: normalizeColor(value.color, DEFAULT_REGION_COLOR),
  }
}

function normalizeEdgePreset(value: unknown): RelationshipEdgePreset | null {
  if (!isRecord(value)) return null
  const name = typeof value.name === 'string' ? value.name.trim() : ''
  if (!name) return null
  return {
    name,
    color: normalizeColor(value.color, DEFAULT_EDGE_COLOR),
    style: normalizeEdgeStyle(value.style),
    direction: normalizeEdgeDirection(value.direction),
  }
}

export function getRelationshipsConfig(meta: DocumentMeta): RelationshipsConfig {
  const rawConfig = meta.relationshipsConfig
  if (!isRecord(rawConfig)) {
    return { nodes: [], edges: [], edgePresets: [], regions: [] }
  }
  const nodes = Array.isArray(rawConfig.nodes)
    ? rawConfig.nodes.map(normalizeNode).filter((node): node is RelationshipNode => node !== null)
    : []
  const nodeIds = new Set(nodes.map((node) => node.id))
  const edges = Array.isArray(rawConfig.edges)
    ? rawConfig.edges.map((edge) => normalizeEdge(edge, nodeIds)).filter((edge): edge is RelationshipEdge => edge !== null)
    : []
  const edgePresets = Array.isArray(rawConfig.edgePresets)
    ? rawConfig.edgePresets.map(normalizeEdgePreset).filter((preset): preset is RelationshipEdgePreset => preset !== null)
    : []
  const regions = Array.isArray(rawConfig.regions)
    ? rawConfig.regions.map(normalizeRegion).filter((region): region is RelationshipRegion => region !== null)
    : []
  return { nodes, edges, edgePresets, regions }
}

export function withRelationshipsConfig(meta: DocumentMeta, config: RelationshipsConfig): DocumentMeta {
  return {
    ...meta,
    type: 'relationships',
    relationshipsConfig: {
      nodes: config.nodes.map((node) => ({
        id: node.id,
        x: node.x,
        y: node.y,
        label: node.label,
        destinationTag: node.destinationTag,
        color: node.color,
        ...(node.description ? { description: node.description } : {}),
        ...(node.emojis && node.emojis.length ? { emojis: node.emojis } : {}),
      })),
      edges: config.edges.map((edge) => ({
        from: edge.from,
        to: edge.to,
        ...(edge.label ? { label: edge.label } : {}),
        color: edge.color,
        style: edge.style,
        direction: edge.direction,
      })),
      edgePresets: config.edgePresets.map((preset) => ({
        name: preset.name,
        color: preset.color,
        style: preset.style,
        direction: preset.direction,
      })),
      regions: config.regions.map((region) => ({
        id: region.id,
        x: region.x,
        y: region.y,
        width: region.width,
        height: region.height,
        label: region.label,
        color: region.color,
      })),
    },
  }
}
