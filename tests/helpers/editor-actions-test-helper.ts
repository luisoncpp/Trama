import { h, render, type VNode } from 'preact'
import { act } from 'preact/test-utils'
import { vi } from 'vitest'
import { EditorActionsProvider } from '../../src/features/project-editor/project-editor-actions-context.tsx'
import { SidebarSectionScopeProvider } from '../../src/features/project-editor/components/sidebar/sidebar-section-scope-context'
import {
  SidebarStateProvider,
  type SidebarProjectState,
} from '../../src/features/project-editor/components/sidebar/sidebar-state-context.tsx'
import type { ProjectEditorActions } from '../../src/features/project-editor/project-editor-types'

const EDITOR_ACTION_KEYS: Array<keyof ProjectEditorActions> = [
  'openProject', 'pickProjectFolder', 'closeProject', 'revealInFileManager',
  'selectFile', 'openFileInPane', 'openPreviousInPaneHistory', 'openNextInPaneHistory',
  'createArticle', 'createMap', 'createCategory', 'renameFile', 'renameFolder',
  'deleteFolder', 'deleteFile', 'editFileTags', 'reorderFiles', 'moveFile', 'moveFolder',
  'setSidebarSection', 'toggleSidebarPanelCollapsed', 'setSidebarPanelWidth',
  'toggleWorkspaceLayoutMode', 'setWorkspaceLayoutRatio', 'setWorkspaceActivePane',
  'setFullscreenEnabled', 'toggleFocusMode', 'setFocusScope', 'setZoomLevel',
  'markEditorDirty', 'updateEditorMeta', 'updateEditorValue', 'saveNow', 'saveSnapshot',
  'revertChanges', 'toggleDocumentRevisions', 'closeDocumentRevisions',
  'selectRevisionCurrent', 'selectDocumentRevision', 'loadMoreDocumentRevisions',
  'requestLoadDocumentRevision', 'cancelLoadDocumentRevision', 'confirmLoadDocumentRevision',
  'resolveConflictReload', 'resolveConflictKeep', 'resolveConflictSaveAsCopy',
  'resolveConflictCompare', 'closeConflictCompare',
]

export function buildEditorActionsSpies(
  overrides: Partial<ProjectEditorActions> = {},
): ProjectEditorActions {
  const spies = {} as ProjectEditorActions
  for (const key of EDITOR_ACTION_KEYS) {
    ;(spies as any)[key] = overrides[key] ?? vi.fn()
  }
  return spies
}

export function buildSidebarStateDefaults(): SidebarProjectState {
  return {
    apiAvailable: true,
    rootPath: '',
    visibleFiles: [],
    selectedPath: null,
    loadingProject: false,
    loadingDocument: false,
    statusMessage: '',
    corkboardOrder: {},
    gitHistory: {
      gitAvailable: true,
      repositoryRoot: null,
      usesParentRepository: false,
      needsInitialization: false,
      loading: false,
    },
    sidebarActiveSection: 'explorer',
    focusModeEnabled: false,
    focusScope: 'paragraph',
  }
}

interface RenderWithEditorActionsOptions {
  actions?: ProjectEditorActions
  container?: HTMLElement
  scopeRoot?: string
  sidebarState?: Partial<SidebarProjectState>
}

export function renderWithEditorActions(
  vnode: VNode<any>,
  { actions, container, scopeRoot, sidebarState }: RenderWithEditorActionsOptions = {},
) {
  const resolvedActions = actions ?? buildEditorActionsSpies()
  const target = container ?? document.createElement('div')
  if (!container) {
    document.body.appendChild(target)
  }
  let inner: VNode<any> = vnode
  if (scopeRoot) {
    inner = h(SidebarSectionScopeProvider, { root: scopeRoot, children: inner })
  }
  const stateValue: SidebarProjectState = { ...buildSidebarStateDefaults(), ...sidebarState }
  const stateWrapped = h(SidebarStateProvider, { value: stateValue, children: inner })
  const wrapped: VNode<any> = h(EditorActionsProvider, { actions: resolvedActions, children: stateWrapped })
  act(() => {
    render(wrapped, target)
  })
  return { container: target, actions: resolvedActions }
}
