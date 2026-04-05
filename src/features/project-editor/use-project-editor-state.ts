import { useMemo, useState } from 'preact/hooks'
import type { DocumentMeta, ProjectSnapshot } from '../../shared/ipc'
import { PROJECT_EDITOR_STRINGS } from './project-editor-strings'
import type { SidebarSection } from './project-editor-types'
import { useSidebarUiState } from './use-sidebar-ui-state'

function collectSidebarPaths(items: ProjectSnapshot['tree'], result: string[]): void {
  for (const item of items) {
    if (item.type === 'folder') {
      result.push(`${item.path}/`)
      collectSidebarPaths(item.children ?? [], result)
      continue
    }

    result.push(item.path)
  }
}

function getVisibleSidebarPaths(snapshot: ProjectSnapshot | null): string[] {
  if (!snapshot) {
    return []
  }

  const paths: string[] = []
  collectSidebarPaths(snapshot.tree, paths)
  return paths
}

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
    sidebarActiveSection: SidebarSection
    sidebarPanelCollapsed: boolean
    sidebarPanelWidth: number
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
    setSidebarActiveSection: (value: SidebarSection) => void
    setSidebarPanelCollapsed: (value: boolean) => void
    setSidebarPanelWidth: (value: number) => void
  }
}

function buildValues(params: {
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
  sidebarUiState: ReturnType<typeof useSidebarUiState>
}): UseProjectEditorStateResult['values'] {
  return {
    apiAvailable: params.apiAvailable,
    rootPath: params.rootPath,
    snapshot: params.snapshot,
    selectedPath: params.selectedPath,
    editorValue: params.editorValue,
    editorMeta: params.editorMeta,
    isDirty: params.isDirty,
    loadingProject: params.loadingProject,
    loadingDocument: params.loadingDocument,
    saving: params.saving,
    externalConflictPath: params.externalConflictPath,
    conflictComparisonContent: params.conflictComparisonContent,
    statusMessage: params.statusMessage,
    visibleFiles: params.visibleFiles,
    sidebarActiveSection: params.sidebarUiState.values.activeSection,
    sidebarPanelCollapsed: params.sidebarUiState.values.panelCollapsed,
    sidebarPanelWidth: params.sidebarUiState.values.panelWidth,
  }
}

function buildSetters(params: {
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
  sidebarUiState: ReturnType<typeof useSidebarUiState>
}): UseProjectEditorStateResult['setters'] {
  return {
    setRootPath: params.setRootPath,
    setSnapshot: params.setSnapshot,
    setSelectedPath: params.setSelectedPath,
    setEditorValue: params.setEditorValue,
    setEditorMeta: params.setEditorMeta,
    setIsDirty: params.setIsDirty,
    setLoadingProject: params.setLoadingProject,
    setLoadingDocument: params.setLoadingDocument,
    setSaving: params.setSaving,
    setExternalConflictPath: params.setExternalConflictPath,
    setConflictComparisonContent: params.setConflictComparisonContent,
    setStatusMessage: params.setStatusMessage,
    setSidebarActiveSection: params.sidebarUiState.setters.setActiveSection,
    setSidebarPanelCollapsed: params.sidebarUiState.setters.setPanelCollapsed,
    setSidebarPanelWidth: params.sidebarUiState.setters.setPanelWidth,
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
  const sidebarUiState = useSidebarUiState()

  const apiAvailable = Boolean(window.tramaApi?.openProject)
  const visibleFiles = useMemo(() => getVisibleSidebarPaths(snapshot), [snapshot])

  const values = buildValues({
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
    sidebarUiState,
  })

  const setters = buildSetters({
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
    sidebarUiState,
  })

  return { values, setters }
}
