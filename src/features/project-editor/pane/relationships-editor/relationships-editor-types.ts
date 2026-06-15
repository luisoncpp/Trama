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

export interface RelationshipsConfig {
  nodes: RelationshipNode[]
  edges: RelationshipEdge[]
  edgePresets: RelationshipEdgePreset[]
}
