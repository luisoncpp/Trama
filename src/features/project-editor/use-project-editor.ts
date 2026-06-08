import { useRef } from 'preact/hooks'
import type { DocumentMeta } from '../../shared/ipc'
import type {
  EditorSerializationRefs,
  EditorZoomRef,
  ProjectEditorModel,
} from './project-editor-types'
import { useProjectEditorActions } from './project-editor-private/actions'
import { useProjectEditorState } from './project-editor-private/state'
import { usePaneWorkspace } from './pane'
import { useLastProjectState } from './use-last-project-state'
import {
  usePaneWorkspaceLifecycle,
  useProjectEditorActionSetters,
  useProjectEditorEffects,
  useZoomRefSync,
} from './use-project-editor-effects'
import {
  createEditorSerializationRefs,
  createNavigationHistoryStore,
  createSaveDocumentProxy,
} from './project-editor-private/use-project-editor-model'
import { isHelpScreenshotCaptureMode } from '../../help/is-help-screenshot-capture-mode'
import { useHelpScreenshotHarness } from '../../help/use-help-screenshot-harness'

function useProjectEditorWorkspace(
  layoutState: ReturnType<typeof useProjectEditorState>['layoutState'],
  paneBindings: ReturnType<typeof useProjectEditorState>['paneBindings'],
) {
  const primarySerializationRef = useRef<EditorSerializationRefs>(createEditorSerializationRefs())
  const secondarySerializationRef = useRef<EditorSerializationRefs>(createEditorSerializationRefs())
  const saveDocumentNowRef = useRef<((path: string, content: string, meta: DocumentMeta) => Promise<void>) | null>(null)
  const lastSavedContentMapRef = useRef(new Map<string, string>())
  const navigationHistoryRef = useRef(createNavigationHistoryStore())
  const zoomRef: EditorZoomRef = { current: layoutState.workspaceLayout.zoomLevel ?? 1.0 }
  const paneWorkspace = usePaneWorkspace(
    layoutState.workspaceLayout,
    paneBindings,
    { primary: primarySerializationRef, secondary: secondarySerializationRef },
    createSaveDocumentProxy(saveDocumentNowRef),
    navigationHistoryRef.current,
    lastSavedContentMapRef.current,
  )

  return {
    paneWorkspace,
    zoomRef,
    saveDocumentNowRef,
    lastSavedContentMapRef,
    serializationRefs: {
      primary: primarySerializationRef,
      secondary: secondarySerializationRef,
    },
  }
}

export function useProjectEditor(): ProjectEditorModel {
  const autoPickProjectFolderOnStart = import.meta.env.MODE !== 'test' && !isHelpScreenshotCaptureMode()
  const state = useProjectEditorState()
  const lastProjectState = useLastProjectState()
  const { values, setters, documentState, layoutState, sidebarState, projectState, uiState, paneBindings } = state
  const workspace = useProjectEditorWorkspace(layoutState, paneBindings)

  usePaneWorkspaceLifecycle(workspace.paneWorkspace, workspace.lastSavedContentMapRef, projectState.rootPath)

  const actionSetters = useProjectEditorActionSetters(
    setters,
    lastProjectState.setLastProjectRootPath,
    lastProjectState.clearLastProjectRootPath,
  )
  const { actions, core } = useProjectEditorActions({
    layoutState,
    projectState,
    uiState,
    sidebarState,
    setters: actionSetters,
    paneWorkspace: workspace.paneWorkspace,
  })
  workspace.saveDocumentNowRef.current = core.saveDocumentNow

  useZoomRefSync(workspace.zoomRef, layoutState.workspaceLayout.zoomLevel ?? 1.0)
  useProjectEditorEffects(
    uiState,
    projectState,
    documentState,
    layoutState,
    paneBindings,
    actionSetters,
    actions,
    core,
    autoPickProjectFolderOnStart,
    workspace.paneWorkspace,
    lastProjectState.lastProjectRootPath,
    lastProjectState.clearLastProjectRootPath,
  )
  useHelpScreenshotHarness(core.openProject, actions)

  return {
    state: (({ editorMeta, ...stateValue }) => stateValue)(values),
    actions,
    serializationRefs: workspace.serializationRefs,
    zoomRef: workspace.zoomRef,
  }
}
