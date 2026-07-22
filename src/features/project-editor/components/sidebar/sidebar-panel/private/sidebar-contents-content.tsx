// @Architecture(descriptionShort="Contents panel: active document heading index with click-to-reveal rows")
import type { JSX } from 'preact'
import { useMemo } from 'preact/hooks'
import { useEditorActions } from '../../../../project-editor-actions-context.tsx'
import { parseDocumentHeadings, type DocumentHeading } from '../../../../document-contents/index.ts'
import { useDocumentContentsState } from '../../document-contents-context.tsx'

const UNAVAILABLE_DOCUMENT_TYPES: ReadonlySet<string> = new Set(['map', 'relationships'])

function ContentsRow({ heading }: { heading: DocumentHeading }): JSX.Element {
  const { revealDocumentHeading } = useEditorActions()
  return (
    <li>
      <button
        type="button"
        class={`sidebar-contents__row sidebar-contents__row--h${heading.level}`}
        title={heading.text}
        onClick={() =>
          revealDocumentHeading({ ordinal: heading.ordinal, level: heading.level, text: heading.text })
        }
      >
        <span class="sidebar-contents__row-text">{heading.text}</span>
      </button>
    </li>
  )
}

function ContentsBody({ headings, unavailable }: {
  headings: DocumentHeading[]
  unavailable: boolean
}): JSX.Element {
  if (unavailable) {
    return <p class="sidebar-contents__empty">Contents is not available for this document type.</p>
  }
  if (headings.length === 0) {
    return <p class="sidebar-contents__empty">No headings in this document.</p>
  }
  return (
    <ul class="sidebar-contents__list">
      {headings.map((heading) => (
        <ContentsRow key={heading.ordinal} heading={heading} />
      ))}
    </ul>
  )
}

export function SidebarContentsContent(): JSX.Element {
  const { editorValue, documentType, selectedPath } = useDocumentContentsState()
  const headings = useMemo(
    /* parseActiveDocumentHeadings */ () => parseDocumentHeadings(editorValue),
    [editorValue] /*Inputs for parseActiveDocumentHeadings*/,
  )
  const unavailable = documentType !== undefined && UNAVAILABLE_DOCUMENT_TYPES.has(documentType)

  return (
    <div class="sidebar-panel-content">
      <aside class="workspace-panel workspace-panel--sidebar">
        <div class="workspace-panel__header">
          <p class="workspace-panel__eyebrow">Contents</p>
        </div>
        {selectedPath === null ? null : <ContentsBody headings={headings} unavailable={unavailable} />}
      </aside>
    </div>
  )
}
