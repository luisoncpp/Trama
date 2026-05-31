/* eslint-disable max-lines-per-function */
import { createPortal } from 'preact/compat'
import { useCallback, useEffect, useState } from 'preact/hooks'
import type { MapMarker } from './map-editor-helpers'

interface MapMarkerDialogProps {
  open: boolean
  marker: MapMarker | null
  title: string
  readOnly?: boolean
  onClose: () => void
  onSave: (marker: MapMarker) => void
}

function createDraft(marker: MapMarker | null) {
  return marker ?? { x: 0, y: 0, label: '', destinationTag: '', color: '#6ea6ff', description: '' }
}

export function MapMarkerDialog({ open, marker, title, readOnly = false, onClose, onSave }: MapMarkerDialogProps) {
  const [draft, setDraft] = useState<MapMarker>(createDraft(marker))

  useEffect(/* syncDraftFromMarker */ () => {
    if (open) {
      setDraft(createDraft(marker))
    }
  }, [marker, open] /*Inputs for syncDraftFromMarker*/)

  useEffect(/* closeMapMarkerDialogOnEscape */ () => {
    if (!open) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose, open] /*Inputs for closeMapMarkerDialogOnEscape*/)

  const handleSave = useCallback(/* handleMapMarkerSave */ () => {
    if (readOnly) return
    const label = draft.label.trim()
    const destinationTag = draft.destinationTag.trim()
    if (!label || !destinationTag) return
    onSave({
      ...draft,
      label,
      destinationTag,
      color: draft.color,
      description: draft.description?.trim() || undefined,
    })
  }, [draft, onSave, readOnly] /*Inputs for handleMapMarkerSave*/)

  if (!open) return null

  return createPortal(
    <div class="sidebar-create-modal" onClick={onClose}>
      <div class="sidebar-create-dialog" role="dialog" aria-modal="true" aria-label={title} onClick={(event) => event.stopPropagation()}>
        <p class="sidebar-create-dialog__title">{title}</p>
        <p class="sidebar-create-dialog__hint">Position: {Math.round(draft.x)}, {Math.round(draft.y)}</p>
        <label class="sidebar-create-dialog__field">
          <span>Label</span>
          <input type="text" value={draft.label} disabled={readOnly} onInput={(event) => setDraft((prev) => ({ ...prev, label: event.currentTarget.value }))} />
        </label>
        <label class="sidebar-create-dialog__field">
          <span>Destination tag</span>
          <input type="text" value={draft.destinationTag} disabled={readOnly} onInput={(event) => setDraft((prev) => ({ ...prev, destinationTag: event.currentTarget.value }))} />
        </label>
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
          <button type="button" class="editor-button editor-button--primary editor-button--inline" onClick={handleSave} disabled={readOnly || !draft.label.trim() || !draft.destinationTag.trim()}>
            Save marker
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

