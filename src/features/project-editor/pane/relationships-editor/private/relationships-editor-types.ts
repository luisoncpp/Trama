// @Architecture(descriptionShort="Shared TypeScript types for adjacent module")
export type RelationshipEdgeStyle = 'solid' | 'dashed' | 'dotted'

export type RelationshipEdgeDirection = 'forward' | 'both' | 'none'

export interface RelationshipNode {
  id: string
  x: number
  y: number
  label: string
  destinationTag: string
  color: string
  description?: string
  emojis: string[]
}

export interface RelationshipEdge {
  from: string
  to: string
  label: string
  color: string
  style: RelationshipEdgeStyle
  direction: RelationshipEdgeDirection
}

export interface RelationshipEdgePreset {
  name: string
  color: string
  style: RelationshipEdgeStyle
  direction: RelationshipEdgeDirection
}

export interface RelationshipLinkTemplate {
  label: string
  color: string
  style: RelationshipEdgeStyle
  direction: RelationshipEdgeDirection
}

export interface RelationshipRegion {
  id: string
  x: number
  y: number
  width: number
  height: number
  label: string
  color: string
}

export type RelationshipsEditorTool = 'select' | 'add-relationship' | 'remove-relationship' | 'add-region'

export interface RelationshipsConfig {
  nodes: RelationshipNode[]
  edges: RelationshipEdge[]
  edgePresets: RelationshipEdgePreset[]
  regions: RelationshipRegion[]
}
