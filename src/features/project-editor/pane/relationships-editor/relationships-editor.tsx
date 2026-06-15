/* eslint-disable max-lines-per-function, max-lines */
import { useCallback, useEffect, useRef, useState } from 'preact/hooks'
import type { DocumentMeta } from '../../../../shared/ipc'
import type { WorkspaceLayoutMode, WorkspacePane } from '../../project-editor-types'
import {
  buildNodeId,
  clampChartValue,
  DEFAULT_EDGE_COLOR,
  DEFAULT_NODE_COLOR,
  getRelationshipsConfig,
  RELATIONSHIPS_STAGE_HEIGHT,
  RELATIONSHIPS_STAGE_WIDTH,
  resolveNodeDestination,
  withRelationshipsConfig,
  type RelationshipEdge,
  type RelationshipEdgePreset,
  type RelationshipNode,
  type RelationshipsConfig,
} from './relationships-editor-helpers'
import { RelationshipsEdgeDialog } from './relationships-edge-dialog'
import { RelationshipsEdgeMarkersLayer, RelationshipsEdgesLayer } from './relationships-edges-layer'
import { RelationshipsNodeDialog } from './relationships-node-dialog'
import { RelationshipsNodesLayer } from './relationships-nodes-layer'
import { RelationshipsEditorToolbar } from './relationships-editor-toolbar'
import type { RelationshipLinkTemplate, RelationshipsEditorTool } from './relationships-editor-types'

interface RelationshipsEditorProps {
  meta: DocumentMeta
  pane: WorkspacePane
  layoutMode: WorkspaceLayoutMode
  readOnlyPreview?: boolean
  tagIndex?: Record<string, string> | null
  onMetaChange: (meta: DocumentMeta) => void
  onNavigate: (filePath: string, pane: WorkspacePane) => void
}

interface ContextMenuState { clientX: number; clientY: number; target: { kind: 'stage'; x: number; y: number } | { kind: 'node'; index: number } | { kind: 'edge'; index: number } }

interface NodeDialogState { mode: 'add' | 'edit'; nodeIndex: number | null; node: RelationshipNode }

interface EdgeDialogState { mode: 'add' | 'edit' | 'template'; edgeIndex: number | null; edge: RelationshipEdge }

interface NodeDragState { pointerId: number; nodeIndex: number; clientX: number; clientY: number; nodeX: number; nodeY: number; moved: boolean }

const DRAG_THRESHOLD_PX = 4

function getTargetPane(layoutMode: WorkspaceLayoutMode, pane: WorkspacePane): WorkspacePane {
  return layoutMode === 'split' ? 'secondary' : pane
}

function presetToTemplate(preset: RelationshipEdgePreset): RelationshipLinkTemplate {
  return { label: preset.name, color: preset.color, style: preset.style, direction: preset.direction }
}

function getHudSecondaryText(scale: number, activeTool: RelationshipsEditorTool, linkSourceId: string | null, linkTemplate: RelationshipLinkTemplate | null): string {
  if (linkSourceId) return 'Click a character to link · Esc to cancel'
  if (activeTool === 'add-relationship' && !linkTemplate) return 'Select a relationship type'
  if (activeTool === 'add-relationship') return 'Click two characters to link'
  if (activeTool === 'remove-relationship') return 'Click a relationship to remove'
  return `${Math.round(scale * 100)}%`
}
function mergePreset(presets: RelationshipEdgePreset[], presetToAdd: RelationshipEdgePreset | null): RelationshipEdgePreset[] {
  if (!presetToAdd) return presets
  const withoutSameName = presets.filter((preset) => preset.name.toLowerCase() !== presetToAdd.name.toLowerCase())
  return [...withoutSameName, presetToAdd]
}

export function RelationshipsEditor({ meta, pane, layoutMode, readOnlyPreview = false, tagIndex, onMetaChange, onNavigate }: RelationshipsEditorProps) {
  const config = getRelationshipsConfig(meta)
  const viewportRef = useRef<HTMLDivElement | null>(null)
  const panRef = useRef<{ pointerId: number; x: number; y: number; offsetX: number; offsetY: number } | null>(null)
  const nodeDragRef = useRef<NodeDragState | null>(null)
  const [scale, setScale] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [notice, setNotice] = useState<string | null>(null)
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null)
  const [nodeDialog, setNodeDialog] = useState<NodeDialogState | null>(null)
  const [edgeDialog, setEdgeDialog] = useState<EdgeDialogState | null>(null)
  const [linkSourceId, setLinkSourceId] = useState<string | null>(null)
  const [activeTool, setActiveTool] = useState<RelationshipsEditorTool>('select')
  const [linkTemplate, setLinkTemplate] = useState<RelationshipLinkTemplate | null>(null)
  const [draggedOverride, setDraggedOverride] = useState<{ id: string; x: number; y: number } | null>(null)

  useEffect(/* clearRelationshipsNoticeAfterDelay */ () => {
    if (!notice) return
    const timeout = window.setTimeout(() => setNotice(null), 2200)
    return () => window.clearTimeout(timeout)
  }, [notice] /*Inputs for clearRelationshipsNoticeAfterDelay*/)

  useEffect(/* cancelRelationshipsLinkOnEscape */ () => {
    if (!linkSourceId) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setLinkSourceId(null)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [linkSourceId] /*Inputs for cancelRelationshipsLinkOnEscape*/)

  const updateConfig = useCallback(/* updateRelationshipsConfig */ (nextConfig: RelationshipsConfig) => {
    onMetaChange(withRelationshipsConfig(meta, nextConfig))
  }, [meta, onMetaChange] /*Inputs for updateRelationshipsConfig*/)

  const toStagePoint = useCallback(/* toRelationshipsStagePoint */ (clientX: number, clientY: number) => {
    const bounds = viewportRef.current?.getBoundingClientRect()
    if (!bounds) return { x: 0, y: 0 }
    return {
      x: clampChartValue((clientX - bounds.left - offset.x) / scale, 0, RELATIONSHIPS_STAGE_WIDTH),
      y: clampChartValue((clientY - bounds.top - offset.y) / scale, 0, RELATIONSHIPS_STAGE_HEIGHT),
    }
  }, [offset.x, offset.y, scale] /*Inputs for toRelationshipsStagePoint*/)

  const handleWheel = useCallback(/* handleRelationshipsWheelZoom */ (event: WheelEvent) => {
    event.preventDefault()
    const bounds = viewportRef.current?.getBoundingClientRect()
    if (!bounds) return
    const pointX = event.clientX - bounds.left
    const pointY = event.clientY - bounds.top
    setScale((previousScale) => {
      const nextScale = clampChartValue(previousScale * (event.deltaY < 0 ? 1.12 : 0.9), 0.25, 4)
      setOffset((previousOffset) => ({
        x: pointX - ((pointX - previousOffset.x) / previousScale) * nextScale,
        y: pointY - ((pointY - previousOffset.y) / previousScale) * nextScale,
      }))
      return nextScale
    })
  }, [] /*Inputs for handleRelationshipsWheelZoom - stable*/)

  const handlePointerDown = useCallback(/* handleRelationshipsPointerDown */ (event: PointerEvent) => {
    if (event.button !== 0 && event.button !== 1) return
    if ((event.target as HTMLElement | null)?.closest('[data-relationships-node="true"]')) return
    if (event.button === 0 && linkSourceId) {
      setLinkSourceId(null)
      return
    }
    panRef.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, offsetX: offset.x, offsetY: offset.y }
  }, [linkSourceId, offset.x, offset.y] /*Inputs for handleRelationshipsPointerDown*/)

  const handleNodePointerDown = useCallback(/* handleRelationshipsNodePointerDown */ (index: number, event: PointerEvent) => {
    if (event.button !== 0) return
    if (activeTool === 'remove-relationship') return
    const node = config.nodes[index]
    ;(event.target as Element | null)?.closest('[data-relationships-node="true"]')?.setPointerCapture(event.pointerId)
    nodeDragRef.current = { pointerId: event.pointerId, nodeIndex: index, clientX: event.clientX, clientY: event.clientY, nodeX: node.x, nodeY: node.y, moved: false }
  }, [activeTool, config.nodes] /*Inputs for handleRelationshipsNodePointerDown*/)

  const handlePointerMove = useCallback(/* handleRelationshipsPointerMove */ (event: PointerEvent) => {
    const nodeDrag = nodeDragRef.current
    if (nodeDrag && nodeDrag.pointerId === event.pointerId) {
      if (readOnlyPreview || activeTool !== 'select') return
      const deltaX = (event.clientX - nodeDrag.clientX) / scale
      const deltaY = (event.clientY - nodeDrag.clientY) / scale
      if (!nodeDrag.moved && Math.hypot(event.clientX - nodeDrag.clientX, event.clientY - nodeDrag.clientY) < DRAG_THRESHOLD_PX) return
      nodeDrag.moved = true
      setDraggedOverride({
        id: config.nodes[nodeDrag.nodeIndex].id,
        x: clampChartValue(nodeDrag.nodeX + deltaX, 0, RELATIONSHIPS_STAGE_WIDTH),
        y: clampChartValue(nodeDrag.nodeY + deltaY, 0, RELATIONSHIPS_STAGE_HEIGHT),
      })
      return
    }
    if (!panRef.current || panRef.current.pointerId !== event.pointerId) return
    setOffset({ x: panRef.current.offsetX + event.clientX - panRef.current.x, y: panRef.current.offsetY + event.clientY - panRef.current.y })
  }, [activeTool, config.nodes, readOnlyPreview, scale] /*Inputs for handleRelationshipsPointerMove*/)

  const handleNodeClick = useCallback(/* handleRelationshipsNodeClick */ (index: number) => {
    const node = config.nodes[index]
    if (linkSourceId) {
      if (node.id === linkSourceId) {
        setNotice('Select a different character to link.')
        return
      }
      if (linkTemplate) {
        updateConfig({ ...config, edges: [...config.edges, { from: linkSourceId, to: node.id, ...linkTemplate }] })
        setLinkSourceId(null)
        return
      }
      setEdgeDialog({ mode: 'add', edgeIndex: null, edge: { from: linkSourceId, to: node.id, label: '', color: DEFAULT_EDGE_COLOR, style: 'solid', direction: 'forward' } })
      setLinkSourceId(null)
      return
    }
    if (activeTool === 'add-relationship') {
      if (!linkTemplate) {
        setNotice('Select a relationship type from the toolbar.')
        return
      }
      setLinkSourceId(node.id)
      setNotice(`From ${node.label}: click another character.`)
      return
    }
    if (activeTool === 'remove-relationship') return
    if (!node.destinationTag) {
      setNotice(`No character tag set for ${node.label}.`)
      return
    }
    const destination = resolveNodeDestination(node.destinationTag, tagIndex ?? null)
    if (!destination) {
      setNotice(`Tag not found: ${node.destinationTag}`)
      return
    }
    onNavigate(destination, getTargetPane(layoutMode, pane))
  }, [activeTool, config, layoutMode, linkSourceId, linkTemplate, onNavigate, pane, tagIndex, updateConfig] /*Inputs for handleRelationshipsNodeClick*/)

  const handlePointerUp = useCallback(/* handleRelationshipsPointerUp */ (event: PointerEvent) => {
    const nodeDrag = nodeDragRef.current
    if (nodeDrag && nodeDrag.pointerId === event.pointerId) {
      nodeDragRef.current = null
      if (nodeDrag.moved && activeTool === 'select') {
        const point = {
          x: clampChartValue(nodeDrag.nodeX + (event.clientX - nodeDrag.clientX) / scale, 0, RELATIONSHIPS_STAGE_WIDTH),
          y: clampChartValue(nodeDrag.nodeY + (event.clientY - nodeDrag.clientY) / scale, 0, RELATIONSHIPS_STAGE_HEIGHT),
        }
        setDraggedOverride(null)
        if (!readOnlyPreview) {
          updateConfig({ ...config, nodes: config.nodes.map((node, index) => index === nodeDrag.nodeIndex ? { ...node, ...point } : node) })
        }
        return
      }
      setDraggedOverride(null)
      handleNodeClick(nodeDrag.nodeIndex)
      return
    }
    if (panRef.current?.pointerId === event.pointerId) panRef.current = null
  }, [activeTool, config, handleNodeClick, readOnlyPreview, scale, updateConfig] /*Inputs for handleRelationshipsPointerUp*/)

  const saveNodeFromDialog = useCallback(/* saveRelationshipsNodeFromDialog */ (nextNode: RelationshipNode) => {
    if (nodeDialog?.mode === 'add') {
      const id = buildNodeId(nextNode.label, config.nodes.map((node) => node.id))
      updateConfig({ ...config, nodes: [...config.nodes, { ...nextNode, id }] })
    } else if (nodeDialog?.nodeIndex !== null && nodeDialog !== null) {
      updateConfig({ ...config, nodes: config.nodes.map((node, index) => index === nodeDialog.nodeIndex ? { ...nextNode, id: node.id } : node) })
    }
    setNodeDialog(null)
    setContextMenu(null)
  }, [config, nodeDialog, updateConfig] /*Inputs for saveRelationshipsNodeFromDialog*/)

  const saveEdgeFromDialog = useCallback(/* saveRelationshipsEdgeFromDialog */ (nextEdge: RelationshipEdge, presetToAdd: RelationshipEdgePreset | null) => {
    if (edgeDialog?.mode === 'template') {
      setLinkTemplate({ label: nextEdge.label, color: nextEdge.color, style: nextEdge.style, direction: nextEdge.direction })
      if (presetToAdd) {
        updateConfig({ ...config, edgePresets: mergePreset(config.edgePresets, presetToAdd) })
      }
      setEdgeDialog(null)
      setActiveTool('add-relationship')
      return
    }
    const edges = edgeDialog?.mode === 'add'
      ? [...config.edges, nextEdge]
      : config.edges.map((edge, index) => index === edgeDialog?.edgeIndex ? nextEdge : edge)
    updateConfig({ ...config, edges, edgePresets: mergePreset(config.edgePresets, presetToAdd) })
    setEdgeDialog(null)
    setContextMenu(null)
  }, [config, edgeDialog, updateConfig] /*Inputs for saveRelationshipsEdgeFromDialog*/)

  const handleToolChange = useCallback(/* handleRelationshipsToolChange */ (tool: RelationshipsEditorTool) => {
    setActiveTool(tool)
    setLinkSourceId(null)
  }, [] /*Inputs for handleRelationshipsToolChange - stable*/)

  const handlePresetSelect = useCallback(/* handleRelationshipsPresetSelect */ (preset: RelationshipEdgePreset) => {
    setLinkTemplate(presetToTemplate(preset))
    setLinkSourceId(null)
  }, [] /*Inputs for handleRelationshipsPresetSelect - stable*/)

  const handleCustomType = useCallback(/* handleRelationshipsCustomType */ () => {
    setEdgeDialog({
      mode: 'template',
      edgeIndex: null,
      edge: linkTemplate
        ? { from: '', to: '', ...linkTemplate }
        : { from: '', to: '', label: '', color: DEFAULT_EDGE_COLOR, style: 'solid', direction: 'forward' },
    })
  }, [linkTemplate] /*Inputs for handleRelationshipsCustomType*/)

  const handleEdgeRemove = useCallback(/* handleRelationshipsEdgeRemove */ (index: number) => {
    updateConfig({ ...config, edges: config.edges.filter((_, edgeIndex) => edgeIndex !== index) })
  }, [config, updateConfig] /*Inputs for handleRelationshipsEdgeRemove*/)

  const deleteNode = useCallback(/* deleteRelationshipsNode */ (index: number) => {
    const node = config.nodes[index]
    updateConfig({
      ...config,
      nodes: config.nodes.filter((_, nodeIndex) => nodeIndex !== index),
      edges: config.edges.filter((edge) => edge.from !== node.id && edge.to !== node.id),
    })
    setContextMenu(null)
  }, [config, updateConfig] /*Inputs for deleteRelationshipsNode*/)

  const renderContextMenuItems = () => {
    if (!contextMenu) return null
    if (contextMenu.target.kind === 'stage') {
      const { x, y } = contextMenu.target
      return (
        <button type="button" class="sidebar-context-menu__item" onClick={() => { setNodeDialog({ mode: 'add', nodeIndex: null, node: { id: '', x, y, label: '', destinationTag: '', color: DEFAULT_NODE_COLOR, description: '' } }); setContextMenu(null) }}>
          Add a character
        </button>
      )
    }
    if (contextMenu.target.kind === 'node') {
      const nodeIndex = contextMenu.target.index
      const node = config.nodes[nodeIndex]
      return [
        <button key="link" type="button" class="sidebar-context-menu__item" onClick={() => { setLinkSourceId(node.id); setNotice(`Linking from ${node.label}: click another character.`); setContextMenu(null) }}>Add relationship</button>,
        <button key="edit" type="button" class="sidebar-context-menu__item" onClick={() => { setNodeDialog({ mode: 'edit', nodeIndex, node }); setContextMenu(null) }}>Edit character</button>,
        <button key="delete" type="button" class="sidebar-context-menu__item sidebar-context-menu__item--danger" onClick={() => deleteNode(nodeIndex)}>Delete character</button>,
      ]
    }
    const edgeIndex = contextMenu.target.index
    return [
      <button key="edit" type="button" class="sidebar-context-menu__item" onClick={() => { setEdgeDialog({ mode: 'edit', edgeIndex, edge: config.edges[edgeIndex] }); setContextMenu(null) }}>Edit relationship</button>,
      <button key="delete" type="button" class="sidebar-context-menu__item sidebar-context-menu__item--danger" onClick={() => { updateConfig({ ...config, edges: config.edges.filter((_, index) => index !== edgeIndex) }); setContextMenu(null) }}>Delete relationship</button>,
    ]
  }

  return (
    <div class="relationships-editor">
      <RelationshipsEditorToolbar
        activeTool={activeTool}
        presets={config.edgePresets}
        linkTemplate={linkTemplate}
        readOnly={readOnlyPreview}
        onToolChange={handleToolChange}
        onPresetSelect={handlePresetSelect}
        onCustomType={handleCustomType}
      />
      <div class="relationships-editor__hud">
        <span>Relationships</span>
        <span>{getHudSecondaryText(scale, activeTool, linkSourceId, linkTemplate)}</span>
      </div>
      <div
        ref={viewportRef}
        class={`relationships-editor__viewport${readOnlyPreview ? ' is-readonly' : ''}${linkSourceId || (activeTool === 'add-relationship' && linkTemplate) ? ' is-linking' : ''}${activeTool === 'remove-relationship' ? ' is-removing' : ''}`}
        onWheel={(event) => handleWheel(event as WheelEvent)}
        onPointerDown={(event) => handlePointerDown(event as PointerEvent)}
        onPointerMove={(event) => handlePointerMove(event as PointerEvent)}
        onPointerUp={(event) => handlePointerUp(event as PointerEvent)}
        onPointerCancel={(event) => handlePointerUp(event as PointerEvent)}
        onContextMenu={(event) => {
          event.preventDefault()
          if (readOnlyPreview) return
          const point = toStagePoint(event.clientX, event.clientY)
          setContextMenu({ clientX: event.clientX, clientY: event.clientY, target: { kind: 'stage', x: point.x, y: point.y } })
        }}
      >
        <div class="relationships-editor__stage" style={{ width: `${RELATIONSHIPS_STAGE_WIDTH}px`, height: `${RELATIONSHIPS_STAGE_HEIGHT}px`, transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})` }}>
          <RelationshipsEdgesLayer
            nodes={config.nodes.map((node) => draggedOverride?.id === node.id ? { ...node, x: draggedOverride.x, y: draggedOverride.y } : node)}
            edges={config.edges}
            onEdgeContextMenu={(index, event) => {
              if (readOnlyPreview) return
              setContextMenu({ clientX: event.clientX, clientY: event.clientY, target: { kind: 'edge', index } })
            }}
            onEdgeClick={activeTool === 'remove-relationship' && !readOnlyPreview ? (index) => handleEdgeRemove(index) : undefined}
          />
          <RelationshipsNodesLayer
            nodes={config.nodes}
            linkSourceId={linkSourceId}
            draggedOverride={draggedOverride}
            onNodePointerDown={handleNodePointerDown}
            onNodeContextMenu={(index, event) => {
              if (readOnlyPreview) return
              setContextMenu({ clientX: event.clientX, clientY: event.clientY, target: { kind: 'node', index } })
            }}
          />
          <RelationshipsEdgeMarkersLayer
            nodes={config.nodes.map((node) => draggedOverride?.id === node.id ? { ...node, x: draggedOverride.x, y: draggedOverride.y } : node)}
            edges={config.edges}
          />
          {config.nodes.length === 0 ? <div class="relationships-editor__empty">Right-click anywhere to add your first character.</div> : null}
        </div>
      </div>
      {notice ? <div class="relationships-editor__notice" role="status">{notice}</div> : null}
      {contextMenu ? (
        <div class="sidebar-context-menu-layer" onClick={() => setContextMenu(null)}>
          <div class="sidebar-context-menu" style={{ left: `${contextMenu.clientX}px`, top: `${contextMenu.clientY}px` }} onClick={(event) => event.stopPropagation()}>
            {renderContextMenuItems()}
          </div>
        </div>
      ) : null}
      <RelationshipsNodeDialog
        open={nodeDialog !== null}
        mode={nodeDialog?.mode ?? 'add'}
        node={nodeDialog?.node ?? null}
        title={nodeDialog?.mode === 'edit' ? 'Edit character' : 'Add character'}
        tagIndex={tagIndex}
        readOnly={readOnlyPreview}
        onClose={() => { setNodeDialog(null); setContextMenu(null) }}
        onSave={saveNodeFromDialog}
      />
      <RelationshipsEdgeDialog
        open={edgeDialog !== null}
        edge={edgeDialog?.edge ?? null}
        nodes={config.nodes}
        presets={config.edgePresets}
        title={edgeDialog?.mode === 'edit' ? 'Edit relationship' : edgeDialog?.mode === 'template' ? 'Custom relationship type' : 'Add relationship'}
        lockedFrom={edgeDialog?.mode === 'add'}
        purpose={edgeDialog?.mode === 'template' ? 'template' : 'edge'}
        readOnly={readOnlyPreview}
        onClose={() => { setEdgeDialog(null); setContextMenu(null) }}
        onSave={saveEdgeFromDialog}
      />
    </div>
  )
}
