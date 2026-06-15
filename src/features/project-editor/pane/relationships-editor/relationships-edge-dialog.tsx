/* eslint-disable max-lines-per-function */
import { createPortal } from 'preact/compat'
import { useCallback, useEffect, useState } from 'preact/hooks'
import { DEFAULT_EDGE_COLOR } from './relationships-config-serialization'
import type { RelationshipEdge, RelationshipEdgeDirection, RelationshipEdgePreset, RelationshipEdgeStyle, RelationshipNode } from './relationships-editor-types'

interface RelationshipsEdgeDialogProps {
  open: boolean
  edge: RelationshipEdge | null
  nodes: RelationshipNode[]
  presets: RelationshipEdgePreset[]
  title: string
  lockedFrom?: boolean
  readOnly?: boolean
  onClose: () => void
  onSave: (edge: RelationshipEdge, presetToAdd: RelationshipEdgePreset | null) => void
}

function createDraft(edge: RelationshipEdge | null): RelationshipEdge {
  return edge ?? { from: '', to: '', label: '', color: DEFAULT_EDGE_COLOR, style: 'solid', direction: 'forward' }
}

function getNodeLabel(nodes: RelationshipNode[], id: string): string {
  return nodes.find((node) => node.id === id)?.label ?? id
}

export function RelationshipsEdgeDialog({ open, edge, nodes, presets, title, lockedFrom = false, readOnly = false, onClose, onSave }: RelationshipsEdgeDialogProps) {
  const [draft, setDraft] = useState<RelationshipEdge>(createDraft(edge))
  const [saveAsPreset, setSaveAsPreset] = useState(false)
  const [presetName, setPresetName] = useState('')

  useEffect(/* syncDraftFromEdge */ () => {
    if (open) {
      setDraft(createDraft(edge))
      setSaveAsPreset(false)
      setPresetName('')
    }
  }, [edge, open] /*Inputs for syncDraftFromEdge*/)

  useEffect(/* closeRelationshipsEdgeDialogOnEscape */ () => {
    if (!open) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose, open] /*Inputs for closeRelationshipsEdgeDialogOnEscape*/)

  const applyPreset = useCallback(/* applyRelationshipsEdgePreset */ (name: string) => {
    const preset = presets.find((candidate) => candidate.name === name)
    if (!preset) return
    setDraft((prev) => ({
      ...prev,
      label: prev.label || preset.name,
      color: preset.color,
      style: preset.style,
      direction: preset.direction,
    }))
  }, [presets] /*Inputs for applyRelationshipsEdgePreset*/)

  const handleSave = useCallback(/* handleRelationshipsEdgeSave */ () => {
    if (readOnly) return
    if (!draft.from || !draft.to || draft.from === draft.to) return
    const presetToAdd = saveAsPreset && presetName.trim()
      ? { name: presetName.trim(), color: draft.color, style: draft.style, direction: draft.direction }
      : null
    onSave({ ...draft, label: draft.label.trim() }, presetToAdd)
  }, [draft, onSave, presetName, readOnly, saveAsPreset] /*Inputs for handleRelationshipsEdgeSave*/)

  if (!open) return null

  return createPortal(
    <div class="sidebar-create-modal" onClick={onClose}>
      <div class="sidebar-create-dialog" role="dialog" aria-modal="true" aria-label={title} onClick={(event) => event.stopPropagation()}>
        <p class="sidebar-create-dialog__title">{title}</p>
        <p class="sidebar-create-dialog__hint">From: {getNodeLabel(nodes, draft.from)}</p>
        {presets.length > 0 ? (
          <label class="sidebar-create-dialog__field">
            <span>Relationship preset</span>
            <select value="" disabled={readOnly} onChange={(event) => { applyPreset(event.currentTarget.value); event.currentTarget.value = '' }}>
              <option value="">Apply a preset...</option>
              {presets.map((preset) => (
                <option key={preset.name} value={preset.name}>{preset.name}</option>
              ))}
            </select>
          </label>
        ) : null}
        <label class="sidebar-create-dialog__field">
          <span>To</span>
          <select value={draft.to} disabled={readOnly} onChange={(event) => setDraft((prev) => ({ ...prev, to: event.currentTarget.value }))}>
            <option value="">Select a character...</option>
            {nodes.filter((node) => node.id !== draft.from || !lockedFrom).map((node) => (
              <option key={node.id} value={node.id} disabled={node.id === draft.from}>{node.label}</option>
            ))}
          </select>
        </label>
        <label class="sidebar-create-dialog__field">
          <span>Label (optional)</span>
          <input type="text" value={draft.label} placeholder="mentor of" disabled={readOnly} onInput={(event) => setDraft((prev) => ({ ...prev, label: event.currentTarget.value }))} />
        </label>
        <label class="sidebar-create-dialog__field">
          <span>Color</span>
          <input type="color" value={draft.color} disabled={readOnly} onInput={(event) => setDraft((prev) => ({ ...prev, color: event.currentTarget.value }))} />
        </label>
        <label class="sidebar-create-dialog__field">
          <span>Line style</span>
          <select value={draft.style} disabled={readOnly} onChange={(event) => setDraft((prev) => ({ ...prev, style: event.currentTarget.value as RelationshipEdgeStyle }))}>
            <option value="solid">Solid</option>
            <option value="dashed">Dashed</option>
            <option value="dotted">Dotted</option>
          </select>
        </label>
        <label class="sidebar-create-dialog__field">
          <span>Direction</span>
          <select value={draft.direction} disabled={readOnly} onChange={(event) => setDraft((prev) => ({ ...prev, direction: event.currentTarget.value as RelationshipEdgeDirection }))}>
            <option value="forward">One way (from → to)</option>
            <option value="both">Both ways (↔)</option>
            <option value="none">No arrows</option>
          </select>
        </label>
        <label class="sidebar-create-dialog__field sidebar-create-dialog__field--inline">
          <input type="checkbox" checked={saveAsPreset} disabled={readOnly} onChange={(event) => setSaveAsPreset(event.currentTarget.checked)} />
          <span>Save as reusable preset</span>
        </label>
        {saveAsPreset ? (
          <label class="sidebar-create-dialog__field">
            <span>Preset name</span>
            <input type="text" value={presetName} placeholder="Rivals" disabled={readOnly} onInput={(event) => setPresetName(event.currentTarget.value)} />
          </label>
        ) : null}
        <div class="sidebar-create-dialog__actions">
          <button type="button" class="editor-button editor-button--secondary editor-button--inline" onClick={onClose}>Cancel</button>
          <button type="button" class="editor-button editor-button--primary editor-button--inline" onClick={handleSave} disabled={readOnly || !draft.from || !draft.to || draft.from === draft.to || (saveAsPreset && !presetName.trim())}>
            Save relationship
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
