import { buildEdgeGeometry, getEdgeDashArray, getParallelEdgeIndex, RELATIONSHIPS_STAGE_HEIGHT, RELATIONSHIPS_STAGE_WIDTH } from './relationships-editor-helpers'
import type { RelationshipEdge, RelationshipNode } from './relationships-editor-types'

interface RelationshipsEdgesLayerProps {
  nodes: RelationshipNode[]
  edges: RelationshipEdge[]
  onEdgeContextMenu: (index: number, event: MouseEvent) => void
}

interface RelationshipsEdgeGroupProps {
  edge: RelationshipEdge
  from: RelationshipNode
  to: RelationshipNode
  parallelIndex: number
  onContextMenu: (event: MouseEvent) => void
}

function buildArrowMarkerId(color: string): string {
  return `relationships-arrow-${color.replace('#', '')}`
}

function RelationshipsEdgeGroup({ edge, from, to, parallelIndex, onContextMenu }: RelationshipsEdgeGroupProps) {
  const geometry = buildEdgeGeometry(from, to, parallelIndex)
  const markerUrl = `url(#${buildArrowMarkerId(edge.color)})`
  return (
    <g
      class="relationships-edge"
      onContextMenu={(event) => {
        event.preventDefault()
        event.stopPropagation()
        onContextMenu(event as unknown as MouseEvent)
      }}
    >
      <path class="relationships-edge__hit" d={geometry.path} />
      <path
        class="relationships-edge__line"
        d={geometry.path}
        stroke={edge.color}
        stroke-dasharray={getEdgeDashArray(edge.style)}
        marker-end={edge.direction !== 'none' ? markerUrl : undefined}
        marker-start={edge.direction === 'both' ? markerUrl : undefined}
      />
      {edge.label ? (
        <text class="relationships-edge__label" x={geometry.labelX} y={geometry.labelY} fill={edge.color} text-anchor="middle">
          {edge.label}
        </text>
      ) : null}
    </g>
  )
}

export function RelationshipsEdgesLayer({ nodes, edges, onEdgeContextMenu }: RelationshipsEdgesLayerProps) {
  const nodesById = new Map(nodes.map((node) => [node.id, node]))
  const arrowColors = [...new Set(edges.filter((edge) => edge.direction !== 'none').map((edge) => edge.color))]

  return (
    <svg
      class="relationships-edges-layer"
      width={RELATIONSHIPS_STAGE_WIDTH}
      height={RELATIONSHIPS_STAGE_HEIGHT}
      viewBox={`0 0 ${RELATIONSHIPS_STAGE_WIDTH} ${RELATIONSHIPS_STAGE_HEIGHT}`}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        {arrowColors.map((color) => (
          <marker
            key={color}
            id={buildArrowMarkerId(color)}
            viewBox="0 0 10 10"
            refX="8"
            refY="5"
            markerWidth="7"
            markerHeight="7"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill={color} />
          </marker>
        ))}
      </defs>
      {edges.map((edge, index) => {
        const from = nodesById.get(edge.from)
        const to = nodesById.get(edge.to)
        if (!from || !to) return null
        return (
          <RelationshipsEdgeGroup
            key={`${edge.from}-${edge.to}-${index}`}
            edge={edge}
            from={from}
            to={to}
            parallelIndex={getParallelEdgeIndex(edges, index)}
            onContextMenu={(event) => onEdgeContextMenu(index, event)}
          />
        )
      })}
    </svg>
  )
}
