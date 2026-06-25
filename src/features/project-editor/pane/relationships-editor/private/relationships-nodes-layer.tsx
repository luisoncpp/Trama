// @Architecture(descriptionShort="Private implementation detail for parent module")
import type { JSX } from 'preact'
import type { RelationshipNode } from './relationships-editor-types'

interface RelationshipsNodesLayerProps {
  nodes: RelationshipNode[]
  linkSourceId: string | null
  draggedOverride: { id: string; x: number; y: number } | null
  readOnly?: boolean
  onNodePointerDown: (index: number, event: PointerEvent) => void
  onNodeContextMenu: (index: number, event: MouseEvent) => void
  onEmojiAddClick: (nodeId: string, anchorRect: DOMRect) => void
  onEmojiRemove: (nodeId: string, emoji: string) => void
}

function buildAnchorStyle(node: RelationshipNode, draggedOverride: { id: string; x: number; y: number } | null): JSX.CSSProperties {
  const position = draggedOverride?.id === node.id ? draggedOverride : node
  return { left: `${position.x}px`, top: `${position.y}px` }
}

function RelationshipsNodeEmojis({ nodeId, emojis, readOnly, onAddClick, onRemove }: {
  nodeId: string
  emojis: string[]
  readOnly: boolean
  onAddClick: (nodeId: string, anchorRect: DOMRect) => void
  onRemove: (nodeId: string, emoji: string) => void
}) {
  const hasEmojis = emojis.length > 0
  if (!hasEmojis && readOnly) return null

  return (
    <div
      class={`relationships-node__emojis${hasEmojis ? '' : ' relationships-node__emojis--empty'}`}
      role={hasEmojis ? 'group' : undefined}
      aria-label={hasEmojis ? 'Character traits' : undefined}
    >
      {emojis.map((emoji) => (
        readOnly ? (
          <span key={emoji} class="relationships-node__emoji-chip" title={emoji} aria-label={emoji}>{emoji}</span>
        ) : (
          <button
            key={emoji}
            type="button"
            class="relationships-node__emoji-chip relationships-node__emoji-chip--interactive"
            title={`${emoji} — click to remove`}
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => { event.stopPropagation(); onRemove(nodeId, emoji) }}
          >
            {emoji}
          </button>
        )
      ))}
      {readOnly ? null : (
        <button
          type="button"
          class="relationships-node__emoji-chip relationships-node__emoji-chip--add"
          title="Add emoji"
          aria-label="Add emoji"
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => { event.stopPropagation(); onAddClick(nodeId, event.currentTarget.getBoundingClientRect()) }}
        >
          <span class="relationships-node__emoji-add-glyph" aria-hidden="true">+</span>
        </button>
      )}
    </div>
  )
}

function RelationshipsNodeAnchor({ node, index, linkSourceId, draggedOverride, readOnly, onNodePointerDown, onNodeContextMenu, onEmojiAddClick, onEmojiRemove }: {
  node: RelationshipNode
  index: number
  linkSourceId: string | null
  draggedOverride: { id: string; x: number; y: number } | null
  readOnly: boolean
  onNodePointerDown: (index: number, event: PointerEvent) => void
  onNodeContextMenu: (index: number, event: MouseEvent) => void
  onEmojiAddClick: (nodeId: string, anchorRect: DOMRect) => void
  onEmojiRemove: (nodeId: string, emoji: string) => void
}) {
  return (
    <div class="relationships-node-anchor" data-relationships-node="true" style={buildAnchorStyle(node, draggedOverride)}>
      <button
        type="button"
        class={`relationships-node${linkSourceId === node.id ? ' is-link-source' : ''}`}
        style={{ borderColor: node.color }}
        aria-label={node.label}
        onPointerDown={(event) => { event.stopPropagation(); onNodePointerDown(index, event as PointerEvent) }}
        onContextMenu={(event) => { event.preventDefault(); event.stopPropagation(); onNodeContextMenu(index, event as MouseEvent) }}
      >
        <span class="relationships-node__dot" style={{ backgroundColor: node.color }} />
        <span class="relationships-node__label">{node.label}</span>
        {node.description ? <span class="relationships-node__tooltip">{node.description}</span> : null}
        <RelationshipsNodeEmojis nodeId={node.id} emojis={node.emojis} readOnly={readOnly} onAddClick={onEmojiAddClick} onRemove={onEmojiRemove} />
      </button>
    </div>
  )
}

export function RelationshipsNodesLayer(props: RelationshipsNodesLayerProps) {
  const { nodes, linkSourceId, draggedOverride, readOnly = false, onNodePointerDown, onNodeContextMenu, onEmojiAddClick, onEmojiRemove } = props
  return (
    <div class="relationships-nodes-layer">
      {nodes.map((node, index) => (
        <RelationshipsNodeAnchor
          key={node.id}
          node={node}
          index={index}
          linkSourceId={linkSourceId}
          draggedOverride={draggedOverride}
          readOnly={readOnly}
          onNodePointerDown={onNodePointerDown}
          onNodeContextMenu={onNodeContextMenu}
          onEmojiAddClick={onEmojiAddClick}
          onEmojiRemove={onEmojiRemove}
        />
      ))}
    </div>
  )
}
