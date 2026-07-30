// @Architecture(descriptionShort="Contents panel: active document heading index with click-to-reveal rows")
import type { JSX } from 'preact'
import { useMemo, useState } from 'preact/hooks'
import { useEditorActions } from '../../../../project-editor-actions-context.tsx'
import { parseDocumentHeadings, type DocumentHeading } from '../../../../document-contents/index.ts'
import { useDocumentContentsState } from '../../document-contents-context.tsx'
import { SidebarContentsLabelDialog } from './sidebar-contents-label-dialog.tsx'

const UNAVAILABLE_DOCUMENT_TYPES: ReadonlySet<string> = new Set(['map', 'relationships'])

function ContentsRow({ heading, canEdit, onEdit }: {
  heading: DocumentHeading
  canEdit: boolean
  onEdit: (heading: DocumentHeading) => void
}): JSX.Element {
  const { revealDocumentHeading } = useEditorActions()
  const type = heading.type ?? 'heading'

  const rowClass = type === 'heading'
    ? `sidebar-contents__row sidebar-contents__row--h${heading.level}`
    : `sidebar-contents__row sidebar-contents__row--${type}`

  const icon = type === 'pagebreak' ? '⎘' : type === 'spacer' ? '↕' : null

  const editableDirective = canEdit && (type === 'pagebreak' || type === 'spacer')

  return (
    <li class="sidebar-contents__item">
      <button
        type="button"
        class={rowClass}
        title={heading.text}
        onClick={() =>
          revealDocumentHeading({ ordinal: heading.ordinal, level: heading.level, text: heading.text })
        }
      >
        {icon ? <span class="sidebar-contents__row-icon">{icon}</span> : null}
        <span class="sidebar-contents__row-text">{heading.text}</span>
      </button>
      {editableDirective ? (
        <button
          type="button"
          class="sidebar-contents__edit"
          title={`Edit ${type === 'pagebreak' ? 'page break' : 'spacer'} label`}
          aria-label={`Edit ${type === 'pagebreak' ? 'page break' : 'spacer'} label`}
          onClick={() => onEdit(heading)}
        >
          &#9998;
        </button>
      ) : null}
    </li>
  )
}

function ContentsBody({ headings, unavailable, canEdit, onEdit }: {
  headings: DocumentHeading[]
  unavailable: boolean
  canEdit: boolean
  onEdit: (heading: DocumentHeading) => void
}): JSX.Element {
  if (unavailable) {
    return <p class="sidebar-contents__empty">Contents is not available for this document type.</p>
  }
  if (headings.length === 0) {
    return <p class="sidebar-contents__empty">No items in document contents.</p>
  }
  return (
    <ul class="sidebar-contents__list">
      {headings.map((heading) => (
        <ContentsRow key={heading.ordinal} heading={heading} canEdit={canEdit} onEdit={onEdit} />
      ))}
    </ul>
  )
}

export function SidebarContentsContent(): JSX.Element {
  const { editorValue, documentType, selectedPath, canEdit } = useDocumentContentsState()
  const { setDocumentContentsLabel } = useEditorActions()
  const [includePageBreaks, setIncludePageBreaks] = useState(true)
  const [includeSpacers, setIncludeSpacers] = useState(true)
  const [labelTarget, setLabelTarget] = useState<DocumentHeading | null>(null)

  const headings = useMemo(
    /* parseActiveDocumentHeadings */ () => parseDocumentHeadings(editorValue, { includePageBreaks, includeSpacers }),
    [editorValue, includePageBreaks, includeSpacers] /*Inputs for parseActiveDocumentHeadings*/,
  )
  const unavailable = documentType !== undefined && UNAVAILABLE_DOCUMENT_TYPES.has(documentType)
  const closeLabelDialog = () => setLabelTarget(null)
  const saveLabel = (label: string) => {
    if (!labelTarget || (labelTarget.type !== 'pagebreak' && labelTarget.type !== 'spacer')) return
    setDocumentContentsLabel({ ordinal: labelTarget.ordinal, type: labelTarget.type, label: label.trim() || null })
    closeLabelDialog()
  }

  return (
    <div class="sidebar-panel-content">
      <aside class="workspace-panel workspace-panel--sidebar">
        <div class="workspace-panel__header">
          <p class="workspace-panel__eyebrow">Table of contents</p>
          <div class="sidebar-contents__toggles">
            <button
              type="button"
              class={`sidebar-contents__toggle ${includePageBreaks ? 'sidebar-contents__toggle--active' : ''}`}
              title="Toggle page breaks"
              onClick={() => setIncludePageBreaks(!includePageBreaks)}
            >
              Page breaks
            </button>
            <button
              type="button"
              class={`sidebar-contents__toggle ${includeSpacers ? 'sidebar-contents__toggle--active' : ''}`}
              title="Toggle spacers"
              onClick={() => setIncludeSpacers(!includeSpacers)}
            >
              Spacers
            </button>
          </div>
        </div>
        {selectedPath === null ? null : <ContentsBody headings={headings} unavailable={unavailable} canEdit={canEdit} onEdit={setLabelTarget} />}
      </aside>
      <SidebarContentsLabelDialog target={labelTarget} onClose={closeLabelDialog} onSave={saveLabel} />
    </div>
  )
}
