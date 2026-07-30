// @Architecture(descriptionShort="Contents modal for editing invisible page-break and spacer labels")
import { useEffect, useState } from 'preact/hooks'
import type { DocumentHeading } from '../../../../document-contents/index.ts'

interface SidebarContentsLabelDialogProps {
  target: DocumentHeading | null
  onClose: () => void
  onSave: (label: string) => void
}

function getDialogCopy(target: DocumentHeading | null): { title: string; fieldLabel: string } {
  return target?.type === 'pagebreak'
    ? { title: 'Edit page break label', fieldLabel: 'Table of contents label' }
    : { title: 'Edit spacer label', fieldLabel: 'Table of contents label' }
}

export function SidebarContentsLabelDialog({ target, onClose, onSave }: SidebarContentsLabelDialogProps) {
  const [value, setValue] = useState('')
  const copy = getDialogCopy(target)

  useEffect(/* resetContentsLabelValue */ () => {
    setValue(target?.label ?? '')
  }, [target?.ordinal, target?.label] /*Inputs for resetContentsLabelValue*/)

  useEffect(/* closeContentsLabelOnEscape */ () => {
    if (!target) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [target, onClose] /*Inputs for closeContentsLabelOnEscape*/)

  if (!target) return null

  return (
    <div class="sidebar-create-modal" onClick={onClose}>
      <form
        class="sidebar-create-dialog"
        role="dialog"
        aria-modal="true"
        aria-label={copy.title}
        onClick={(event) => event.stopPropagation()}
        onSubmit={(event) => { event.preventDefault(); onSave(value) }}
      >
        <p class="sidebar-create-dialog__title">{copy.title}</p>
        <p class="sidebar-create-dialog__hint">Shown only in Contents. Leave empty to remove the label.</p>
        <label class="sidebar-create-dialog__field">
          <span>{copy.fieldLabel}</span>
          <input
            type="text"
            value={value}
            autoFocus
            onInput={(event) => setValue(event.currentTarget.value)}
          />
        </label>
        <div class="sidebar-create-dialog__actions">
          <button type="button" class="editor-button editor-button--secondary editor-button--inline" onClick={onClose}>Cancel</button>
          <button type="submit" class="editor-button editor-button--primary editor-button--inline">Save label</button>
        </div>
      </form>
    </div>
  )
}
