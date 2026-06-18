import {
  buildEdgeGeometry,
  getEdgeDashArray,
  getParallelEdgeIndex,
  RELATIONSHIPS_STAGE_MIN_X,
  RELATIONSHIPS_STAGE_MIN_Y,
  RELATIONSHIPS_STAGE_SPAN_HEIGHT,
  RELATIONSHIPS_STAGE_SPAN_WIDTH,
} from './relationships-editor-helpers'
import type { RelationshipEdge, RelationshipNode } from './relationships-editor-types'

interface RelationshipsEdgesLayerProps {
  nodes: RelationshipNode[]
  edges: RelationshipEdge[]
  onEdgeContextMenu: (index: number, event: MouseEvent) => void
  onEdgeClick?: (index: number, event: MouseEvent) => void
}

interface RelationshipsEdgeGroupProps {
  edge: RelationshipEdge
  from: RelationshipNode
  to: RelationshipNode
  parallelIndex: number
  onContextMenu: (event: MouseEvent) => void
  onClick?: (event: MouseEvent) => void
  showMarkers: boolean
}

interface RelationshipsEdgesSvgProps {
  nodes: RelationshipNode[]
  edges: RelationshipEdge[]
  showMarkers: boolean
  onEdgeContextMenu?: (index: number, event: MouseEvent) => void
  onEdgeClick?: (index: number, event: MouseEvent) => void
}

function buildArrowMarkerId(color: string): string {
  return `relationships-arrow-${color.replace('#', '')}`
}

function RelationshipsEdgeGroup({ edge, from, to, parallelIndex, onContextMenu, onClick, showMarkers }: RelationshipsEdgeGroupProps) {
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
          <path
            class="relationships-edge__hit"
            d={geometry.path}
            onClick={onClick ? (event) => {
              event.preventDefault()
              event.stopPropagation()
              onClick(event as unknown as MouseEvent)
            } : undefined}
          />
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

function RelationshipsEdgeMarkersDefs({ edges }: { edges: RelationshipEdge[] }) {
  const arrowColors = [...new Set(edges.filter((edge) => edge.direction !== 'none').map((edge) => edge.color))]
  return (
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
  )
}

function RelationshipsEdgesSvg({ nodes, edges, showMarkers, onEdgeContextMenu, onEdgeClick }: RelationshipsEdgesSvgProps) {
  const nodesById = new Map(nodes.map((node) => [node.id, node]))

  return (
    <svg
      class={showMarkers ? 'relationships-edges-markers-layer' : 'relationships-edges-layer'}
      width={RELATIONSHIPS_STAGE_SPAN_WIDTH}
      height={RELATIONSHIPS_STAGE_SPAN_HEIGHT}
      viewBox={`${RELATIONSHIPS_STAGE_MIN_X} ${RELATIONSHIPS_STAGE_MIN_Y} ${RELATIONSHIPS_STAGE_SPAN_WIDTH} ${RELATIONSHIPS_STAGE_SPAN_HEIGHT}`}
      style={{ left: `${RELATIONSHIPS_STAGE_MIN_X}px`, top: `${RELATIONSHIPS_STAGE_MIN_Y}px` }}
      xmlns="http://www.w3.org/2000/svg"
    >
      {showMarkers ? <RelationshipsEdgeMarkersDefs edges={edges} /> : null}
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
            onClick={onEdgeClick ? (event) => onEdgeClick(index, event) : undefined}
          />
        )
      })}
    </svg>
  )
}

export function RelationshipsEdgesLayer({ nodes, edges, onEdgeContextMenu, onEdgeClick }: RelationshipsEdgesLayerProps) {
  return <RelationshipsEdgesSvg nodes={nodes} edges={edges} showMarkers={false} onEdgeContextMenu={onEdgeContextMenu} onEdgeClick={onEdgeClick} />
}

export function RelationshipsEdgeMarkersLayer({ nodes, edges }: Pick<RelationshipsEdgesLayerProps, 'nodes' | 'edges'>) {
  return <RelationshipsEdgesSvg nodes={nodes} edges={edges} showMarkers={true} />
}
