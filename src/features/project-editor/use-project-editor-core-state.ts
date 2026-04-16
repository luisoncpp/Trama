import { useState } from 'preact/hooks'
import type { ProjectSnapshot } from '../../shared/ipc'
import type { PaneDocumentState } from './project-editor-types'
import { PROJECT_EDITOR_STRINGS } from './project-editor-strings'

function useProjectEditorCoreState() {
  const [rootPath, setRootPath] = useState('')
  const [snapshot, setSnapshot] = useState<ProjectSnapshot | null>(null)
  const [primaryPane, setPrimaryPane] = useState<PaneDocumentState>({
    path: null,
    content: '',
    meta: {},
    isDirty: false,
  })
  const [secondaryPane, setSecondaryPane] = useState<PaneDocumentState>({
    path: null,
    content: '',
    meta: {},
    isDirty: false,
  })
  const [loadingProject, setLoadingProject] = useState(false)
  const [loadingDocument, setLoadingDocument] = useState(false)
  const [saving, setSaving] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [externalConflictPath, setExternalConflictPath] = useState<string | null>(null)
  const [conflictComparisonContent, setConflictComparisonContent] = useState<string | null>(null)
  const [statusMessage, setStatusMessage] = useState<string>(PROJECT_EDITOR_STRINGS.initialStatus)

  return {
    rootPath,
    setRootPath,
    snapshot,
    setSnapshot,
    primaryPane,
    setPrimaryPane,
    secondaryPane,
    setSecondaryPane,
    loadingProject,
    setLoadingProject,
    loadingDocument,
    setLoadingDocument,
    saving,
    setSaving,
    isFullscreen,
    setIsFullscreen,
    externalConflictPath,
    setExternalConflictPath,
    conflictComparisonContent,
    setConflictComparisonContent,
    statusMessage,
    setStatusMessage,
  }
}

export type ProjectEditorCoreState = ReturnType<typeof useProjectEditorCoreState>
export { useProjectEditorCoreState }