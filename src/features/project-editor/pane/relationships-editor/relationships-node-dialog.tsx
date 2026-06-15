/* eslint-disable max-lines-per-function */
import { createPortal } from 'preact/compat'
import { useCallback, useEffect, useState } from 'preact/hooks'
import { DEFAULT_NODE_COLOR } from './relationships-config-serialization'
import { resolveAutoNodeTag } from './relationships-editor-helpers'
import type { RelationshipNode } from './relationships-editor-types'

interface RelationshipsNodeDialogProps {
  open: boolean
  mode: 'add' | 'edit'
  node: RelationshipNode | null
  title: string
  tagIndex?: Record<string, string> | null
  readOnly?: boolean
  onClose: () => void
  onSave: (node: RelationshipNode) => void
}

function createDraft(node: RelationshipNode | null): RelationshipNode {
  return node ?? { id: '', x: 0, y: 0, label: '', destinationTag: '', color: DEFAULT_NODE_COLOR, description: '' }
}

export function RelationshipsNodeDialog({ open, mode, node, title, tagIndex = null, readOnly = false, onClose, onSave }: RelationshipsNodeDialogProps) {
  const [draft, setDraft] = useState<RelationshipNode>(createDraft(node))
  const [autoTag, setAutoTag] = useState(true)

  useEffect(/* syncDraftFromNode */ () => {
    if (open) {
      setDraft(createDraft(node))
      setAutoTag(mode === 'add')
    }
  }, [mode, node, open] /*Inputs for syncDraftFromNode*/)

  useEffect(/* closeRelationshipsNodeDialogOnEscape */ () => {
    if (!open) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose, open] /*Inputs for closeRelationshipsNodeDialogOnEscape*/)

  const resolvedAutoTag = mode === 'add' && autoTag ? resolveAutoNodeTag(draft.label, tagIndex) : ''

  const handleSave = useCallback(/* handleRelationshipsNodeSave */ () => {
    if (readOnly) return
    const label = draft.label.trim()
    if (!label) return
    const destinationTag = mode === 'add' && autoTag
      ? resolveAutoNodeTag(label, tagIndex)
      : draft.destinationTag.trim()
    onSave({
      ...draft,
      label,
      destinationTag,
      description: draft.description?.trim() || undefined,
    })
  }, [autoTag, draft, mode, onSave, readOnly, tagIndex] /*Inputs for handleRelationshipsNodeSave*/)

  if (!open) return null

  return createPortal(
    <div class="sidebar-create-modal" onClick={onClose}>
      <div class="sidebar-create-dialog" role="dialog" aria-modal="true" aria-label={title} onClick={(event) => event.stopPropagation()}>
        <p class="sidebar-create-dialog__title">{title}</p>
        <p class="sidebar-create-dialog__hint">Position: {Math.round(draft.x)}, {Math.round(draft.y)}</p>
        <label class="sidebar-create-dialog__field">
          <span>Name</span>
          <input type="text" value={draft.label} disabled={readOnly} onInput={(event) => setDraft((prev) => ({ ...prev, label: event.currentTarget.value }))} />
        </label>
        <label class="sidebar-create-dialog__field">
          <span>Character tag (optional)</span>
          <input
            type="text"
            value={mode === 'add' && autoTag ? resolvedAutoTag : draft.destinationTag}
            placeholder="aldren"
            disabled={readOnly || (mode === 'add' && autoTag)}
            onInput={(event) => setDraft((prev) => ({ ...prev, destinationTag: event.currentTarget.value }))}
          />
        </label>
        {mode === 'add' ? (
          <label class="sidebar-create-dialog__field sidebar-create-dialog__field--inline">
            <input type="checkbox" checked={autoTag} disabled={readOnly} onChange={(event) => setAutoTag(event.currentTarget.checked)} />
            <span>Auto</span>
          </label>
        ) : null}
        <label class="sidebar-create-dialog__field">
          <span>Color</span>
          <input type="color" value={draft.color} disabled={readOnly} onInput={(event) => setDraft((prev) => ({ ...prev, color: event.currentTarget.value }))} />
        </label>
        <label class="sidebar-create-dialog__field">
          <span>Description</span>
          <input type="text" value={draft.description ?? ''} disabled={readOnly} onInput={(event) => setDraft((prev) => ({ ...prev, description: event.currentTarget.value }))} />
        </label>
        <div class="sidebar-create-dialog__actions">
          <button type="button" class="editor-button editor-button--secondary editor-button--inline" onClick={onClose}>Cancel</button>
          <button type="button" class="editor-button editor-button--primary editor-button--inline" onClick={handleSave} disabled={readOnly || !draft.label.trim()}>
            Save character
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
