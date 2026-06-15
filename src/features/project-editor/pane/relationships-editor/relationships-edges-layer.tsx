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
  showMarkers: boolean
}

interface RelationshipsEdgesSvgProps {
  nodes: RelationshipNode[]
  edges: RelationshipEdge[]
  showMarkers: boolean
  onEdgeContextMenu?: (index: number, event: MouseEvent) => void
}

function buildArrowMarkerId(color: string): string {
  return `relationships-arrow-${color.replace('#', '')}`
}

function RelationshipsEdgeGroup({ edge, from, to, parallelIndex, onContextMenu, showMarkers }: RelationshipsEdgeGroupProps) {
  const geometry = buildEdgeGeometry(from, to, parallelIndex)
  const markerUrl = `url(#${buildArrowMarkerId(edge.color)})`
  return (
    <g
      class="relationships-edge"
      onContextMenu={showMarkers ? undefined : (event) => {
        event.preventDefault()
        event.stopPropagation()
        onContextMenu(event as unknown as MouseEvent)
      }}
    >
      {showMarkers ? (
        <path
          class="relationships-edge__markers"
          d={geometry.path}
          marker-end={edge.direction !== 'none' ? markerUrl : undefined}
          marker-start={edge.direction === 'both' ? markerUrl : undefined}
        />
      ) : (
        <>
          <path class="relationships-edge__hit" d={geometry.path} />
          <path
            class="relationships-edge__line"
            d={geometry.path}
            stroke={edge.color}
            stroke-dasharray={getEdgeDashArray(edge.style)}
          />
          {edge.label ? (
            <text class="relationships-edge__label" x={geometry.labelX} y={geometry.labelY} fill={edge.color} text-anchor="middle">
              {edge.label}
            </text>
          ) : null}
        </>
      )}
    </g>
  )
}

function RelationshipsEdgesSvg({ nodes, edges, showMarkers, onEdgeContextMenu }: RelationshipsEdgesSvgProps) {
  const nodesById = new Map(nodes.map((node) => [node.id, node]))
  const arrowColors = showMarkers
    ? [...new Set(edges.filter((edge) => edge.direction !== 'none').map((edge) => edge.color))]
    : []

  return (
    <svg
      class={showMarkers ? 'relationships-edges-markers-layer' : 'relationships-edges-layer'}
      width={RELATIONSHIPS_STAGE_WIDTH}
      height={RELATIONSHIPS_STAGE_HEIGHT}
      viewBox={`0 0 ${RELATIONSHIPS_STAGE_WIDTH} ${RELATIONSHIPS_STAGE_HEIGHT}`}
      xmlns="http://www.w3.org/2000/svg"
    >
      {showMarkers ? (
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
      ) : null}
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
            showMarkers={showMarkers}
            onContextMenu={(event) => onEdgeContextMenu?.(index, event)}
          />
        )
      })}
    </svg>
  )
}

export function RelationshipsEdgesLayer({ nodes, edges, onEdgeContextMenu }: RelationshipsEdgesLayerProps) {
  return <RelationshipsEdgesSvg nodes={nodes} edges={edges} showMarkers={false} onEdgeContextMenu={onEdgeContextMenu} />
}

export function RelationshipsEdgeMarkersLayer({ nodes, edges }: Pick<RelationshipsEdgesLayerProps, 'nodes' | 'edges'>) {
  return <RelationshipsEdgesSvg nodes={nodes} edges={edges} showMarkers={true} />
}
