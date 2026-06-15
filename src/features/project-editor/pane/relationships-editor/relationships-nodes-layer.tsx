import type { JSX } from 'preact'
import type { RelationshipNode } from './relationships-editor-types'

interface RelationshipsNodesLayerProps {
  nodes: RelationshipNode[]
  linkSourceId: string | null
  draggedOverride: { id: string; x: number; y: number } | null
  onNodePointerDown: (index: number, event: PointerEvent) => void
  onNodeContextMenu: (index: number, event: MouseEvent) => void
}

function buildNodeStyle(node: RelationshipNode, draggedOverride: { id: string; x: number; y: number } | null): JSX.CSSProperties {
  const position = draggedOverride?.id === node.id ? draggedOverride : node
  return {
    left: `${position.x}px`,
    top: `${position.y}px`,
    borderColor: node.color,
  }
}

export function RelationshipsNodesLayer({ nodes, linkSourceId, draggedOverride, onNodePointerDown, onNodeContextMenu }: RelationshipsNodesLayerProps) {
  return (
    <div class="relationships-nodes-layer">
      {nodes.map((node, index) => (
        <button
          key={node.id}
          type="button"
          class={`relationships-node${linkSourceId === node.id ? ' is-link-source' : ''}`}
          data-relationships-node="true"
          style={buildNodeStyle(node, draggedOverride)}
          aria-label={node.label}
          onPointerDown={(event) => {
            event.stopPropagation()
            onNodePointerDown(index, event as PointerEvent)
          }}
          onContextMenu={(event) => {
            event.preventDefault()
            event.stopPropagation()
            onNodeContextMenu(index, event as MouseEvent)
          }}
        >
          <span class="relationships-node__dot" style={{ backgroundColor: node.color }} />
          <span class="relationships-node__label">{node.label}</span>
          {node.description ? (
            <span class="relationships-node__tooltip">{node.description}</span>
          ) : null}
        </button>
      ))}
    </div>
  )
}
