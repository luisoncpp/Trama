import { useMemo, useState } from 'preact/hooks'
import type { ProjectSnapshot } from '../../shared/ipc'
import type { PaneDocumentState } from './project-editor-types'
import { PROJECT_EDITOR_STRINGS } from './project-editor-strings'

function createEmptyPane(): PaneDocumentState {
  return {
    path: null,
    content: '',
    meta: {},
    isDirty: false,
  }
}

function usePaneStates() {
  const [primaryPane, setPrimaryPane] = useState<PaneDocumentState>(createEmptyPane)
  const [secondaryPane, setSecondaryPane] = useState<PaneDocumentState>(createEmptyPane)
  return { primaryPane, setPrimaryPane, secondaryPane, setSecondaryPane }
}

function useProjectEditorCoreState() {
  const [rootPath, setRootPath] = useState('')
  const [snapshot, setSnapshot] = useState<ProjectSnapshot | null>(null)
  const { primaryPane, setPrimaryPane, secondaryPane, setSecondaryPane } = usePaneStates()
  const [loadingProject, setLoadingProject] = useState(false)
  const [loadingDocument, setLoadingDocument] = useState(false)
  const [saving, setSaving] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [externalConflictPath, setExternalConflictPath] = useState<string | null>(null)
  const [conflictComparisonContent, setConflictComparisonContent] = useState<string | null>(null)
  const [statusMessage, setStatusMessage] = useState<string>(PROJECT_EDITOR_STRINGS.initialStatus)

  return useMemo(
    () => ({
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
    }),
    [
      rootPath, snapshot, primaryPane, secondaryPane,
      loadingProject, loadingDocument, saving, isFullscreen,
      externalConflictPath, conflictComparisonContent, statusMessage,
    ],
  )
}

export type ProjectEditorCoreState = ReturnType<typeof useProjectEditorCoreState>
export { useProjectEditorCoreState }
