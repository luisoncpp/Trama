import { useMemo, useState } from 'preact/hooks'
import type { DocumentMeta, ProjectSnapshot } from '../../shared/ipc'
import { PROJECT_EDITOR_STRINGS } from './project-editor-strings'

export interface UseProjectEditorStateResult {
  values: {
    apiAvailable: boolean
    rootPath: string
    snapshot: ProjectSnapshot | null
    selectedPath: string | null
    editorValue: string
    editorMeta: DocumentMeta
    isDirty: boolean
    loadingProject: boolean
    loadingDocument: boolean
    saving: boolean
    externalConflictPath: string | null
    conflictComparisonContent: string | null
    statusMessage: string
    visibleFiles: string[]
  }
  setters: {
    setRootPath: (value: string) => void
    setSnapshot: (value: ProjectSnapshot | null) => void
    setSelectedPath: (value: string | null) => void
    setEditorValue: (value: string) => void
    setEditorMeta: (value: DocumentMeta) => void
    setIsDirty: (value: boolean) => void
    setLoadingProject: (value: boolean) => void
    setLoadingDocument: (value: boolean) => void
    setSaving: (value: boolean) => void
    setExternalConflictPath: (value: string | null) => void
    setConflictComparisonContent: (value: string | null) => void
    setStatusMessage: (value: string) => void
  }
}

export function useProjectEditorState(): UseProjectEditorStateResult {
  const [rootPath, setRootPath] = useState('')
  const [snapshot, setSnapshot] = useState<ProjectSnapshot | null>(null)
  const [selectedPath, setSelectedPath] = useState<string | null>(null)
  const [editorValue, setEditorValue] = useState('')
  const [editorMeta, setEditorMeta] = useState<DocumentMeta>({})
  const [isDirty, setIsDirty] = useState(false)
  const [loadingProject, setLoadingProject] = useState(false)
  const [loadingDocument, setLoadingDocument] = useState(false)
  const [saving, setSaving] = useState(false)
  const [externalConflictPath, setExternalConflictPath] = useState<string | null>(null)
  const [conflictComparisonContent, setConflictComparisonContent] = useState<string | null>(null)
  const [statusMessage, setStatusMessage] = useState<string>(PROJECT_EDITOR_STRINGS.initialStatus)

  const apiAvailable = Boolean(window.tramaApi?.openProject)
  const visibleFiles = useMemo(() => snapshot?.markdownFiles ?? [], [snapshot])

  return {
    values: {
      apiAvailable,
      rootPath,
      snapshot,
      selectedPath,
      editorValue,
      editorMeta,
      isDirty,
      loadingProject,
      loadingDocument,
      saving,
      externalConflictPath,
      conflictComparisonContent,
      statusMessage,
      visibleFiles,
    },
    setters: {
      setRootPath,
      setSnapshot,
      setSelectedPath,
      setEditorValue,
      setEditorMeta,
      setIsDirty,
      setLoadingProject,
      setLoadingDocument,
      setSaving,
      setExternalConflictPath,
      setConflictComparisonContent,
      setStatusMessage,
    },
  }
}
