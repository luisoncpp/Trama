// @Architecture(descriptionShort="Narrow Preact context carrying the active pane document inputs for the Contents panel")
import { createContext, type ComponentChildren } from 'preact'
import { useContext } from 'preact/hooks'
import type { DocumentMeta } from '../../../../shared/ipc'

export interface DocumentContentsState {
  editorValue: string
  documentType: DocumentMeta['type']
  selectedPath: string | null
  canEdit: boolean
}

const DocumentContentsContext = createContext<DocumentContentsState | null>(null)

export function DocumentContentsProvider({ value, children }: {
  value: DocumentContentsState
  children: ComponentChildren
}) {
  return <DocumentContentsContext.Provider value={value}>{children}</DocumentContentsContext.Provider>
}

export function useDocumentContentsState(): DocumentContentsState {
  const ctx = useContext(DocumentContentsContext)
  if (!ctx) {
    throw new Error('useDocumentContentsState must be used inside DocumentContentsProvider')
  }
  return ctx
}
