// @Architecture(descriptionShort="Private implementation detail for parent module")
import { createPortal } from 'preact/compat'
import { useCallback, useEffect, useState } from 'preact/hooks'
import { DEFAULT_REGION_COLOR } from './relationships-config-serialization'
import type { RelationshipRegion } from './relationships-editor-types'

interface RelationshipsRegionDialogProps {
  open: boolean
  mode: 'add' | 'edit'
  region: RelationshipRegion | null
  title: string
  readOnly?: boolean
  onClose: () => void
  onSave: (region: RelationshipRegion) => void
}

function createDraft(region: RelationshipRegion | null): RelationshipRegion {
  return region ?? {
    id: '',
    x: 0,
    y: 0,
    width: 320,
    height: 200,
    label: '',
    color: DEFAULT_REGION_COLOR,
  }
}

export function RelationshipsRegionDialog({ open, mode, region, title, readOnly = false, onClose, onSave }: RelationshipsRegionDialogProps) {
  const [draft, setDraft] = useState<RelationshipRegion>(createDraft(region))

  useEffect(/* syncDraftFromRegion */ () => {
    if (open) setDraft(createDraft(region))
  }, [open, region] /*Inputs for syncDraftFromRegion*/)

  useEffect(/* closeRelationshipsRegionDialogOnEscape */ () => {
    if (!open) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose, open] /*Inputs for closeRelationshipsRegionDialogOnEscape*/)

  const handleSave = useCallback(/* handleRelationshipsRegionSave */ () => {
    if (readOnly) return
    const label = draft.label.trim()
    if (!label) return
    onSave({ ...draft, label })
  }, [draft, onSave, readOnly] /*Inputs for handleRelationshipsRegionSave*/)

  if (!open) return null

  return createPortal(
    <div class="sidebar-create-modal" onClick={onClose}>
      <div class="sidebar-create-dialog" role="dialog" aria-modal="true" aria-label={title} onClick={(event) => event.stopPropagation()}>
        <p class="sidebar-create-dialog__title">{title}</p>
        <p class="sidebar-create-dialog__hint">
          Position: {Math.round(draft.x)}, {Math.round(draft.y)} · Size: {Math.round(draft.width)} × {Math.round(draft.height)}
        </p>
        <label class="sidebar-create-dialog__field">
          <span>Label</span>
          <input type="text" value={draft.label} disabled={readOnly} onInput={(event) => setDraft((prev) => ({ ...prev, label: event.currentTarget.value }))} />
        </label>
        <label class="sidebar-create-dialog__field">
          <span>Color</span>
          <input type="color" value={draft.color} disabled={readOnly} onInput={(event) => setDraft((prev) => ({ ...prev, color: event.currentTarget.value }))} />
        </label>
        <div class="sidebar-create-dialog__actions">
          <button type="button" class="editor-button editor-button--secondary editor-button--inline" onClick={onClose}>Cancel</button>
          <button type="button" class="editor-button editor-button--primary editor-button--inline" onClick={handleSave} disabled={readOnly || !draft.label.trim()}>
            {mode === 'edit' ? 'Save name' : 'Add region'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
