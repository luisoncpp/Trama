import type { ProjectEditorModel } from './project-editor-types'
import { ConflictBanner } from './components/conflict-banner'
import { ConflictComparePanel } from './components/conflict-compare-panel'
import { ProjectEditorDialogs } from './project-editor-dialogs'
import { useProjectEditorShellActions, useProjectEditorShellState } from './project-editor-shell'
import { useProjectEditorViewDialogs } from './project-editor-view-dialogs'
import { ProjectEditorLayout } from './project-editor-view-layout'
import type { ProjectEditorShellSettingsProps } from './project-editor-shell-props'
import { useSidebarLayout } from './layout/use-sidebar-layout'
import { WindowTitlebar } from './window-titlebar'

interface ProjectEditorViewProps extends ProjectEditorShellSettingsProps {
  model: ProjectEditorModel
}

function buildShellClassName(model: ProjectEditorModel): string {
  const { state } = model
  return [
    'editor-shell',
    state.workspaceLayout.mode === 'split' ? 'is-split' : '',
    state.workspaceLayout.focusModeEnabled ? 'is-focus-mode' : '',
    state.isFullscreen ? 'is-fullscreen' : '',
    `focus-scope-${state.workspaceLayout.focusScope}`,
  ].filter(Boolean).join(' ')
}

function buildSidebarStyle(sidebarWidthPx: number) {
  return {
    '--sidebar-width': `${sidebarWidthPx}px`,
  }
}

function ProjectEditorConflictOverlays({ model }: { model: ProjectEditorModel }) {
  const { state, actions } = model

  return (
    <>
      {state.externalConflictPath && (
        <ConflictBanner
          externalConflictPath={state.externalConflictPath}
          onReload={actions.resolveConflictReload}
          onKeep={actions.resolveConflictKeep}
          onSaveAsCopy={actions.resolveConflictSaveAsCopy}
          onCompare={actions.resolveConflictCompare}
        />
      )}
      {state.externalConflictPath && state.conflictComparisonContent !== null && (
        <ConflictComparePanel
          externalConflictPath={state.externalConflictPath}
          diskContent={state.conflictComparisonContent}
          localContent={state.editorValue}
          onClose={actions.closeConflictCompare}
        />
      )}
    </>
  )
}

function useProjectEditorViewState(model: ProjectEditorModel, props: Omit<ProjectEditorViewProps, 'model'>) {
  const shellState = useProjectEditorShellState(model)
  const shellActions = useProjectEditorShellActions(model)
  const { effectiveCollapsed, sidebarWidthPx } = useSidebarLayout({
    sidebarPanelCollapsed: shellState.sidebarPanelCollapsed,
    sidebarPanelWidth: shellState.sidebarPanelWidth,
  })
  const { dialogsProps } = useProjectEditorViewDialogs(
    shellState.rootPath,
    shellState.visibleFiles,
    model.state.snapshot,
    model.actions.openProject,
  )
  const sidebarStyle = buildSidebarStyle(sidebarWidthPx)
  const layoutProps = {
    model,
    shellState,
    shellActions,
    effectiveCollapsed,
    sidebarStyle,
    dialogsProps,
    themePreference: props.themePreference,
    resolvedTheme: props.resolvedTheme,
    onThemePreferenceChange: props.onThemePreferenceChange,
    spellcheckEnabled: props.spellcheckEnabled,
    spellcheckLanguage: props.spellcheckLanguage,
    spellcheckLanguageOptions: props.spellcheckLanguageOptions,
    spellcheckLanguageSelectionSupported: props.spellcheckLanguageSelectionSupported,
    onSpellcheckEnabledChange: props.onSpellcheckEnabledChange,
    onSpellcheckLanguageChange: props.onSpellcheckLanguageChange,
  }
  return { layoutProps, dialogsProps }
}

export function ProjectEditorView({ model, ...rest }: ProjectEditorViewProps) {
  const { layoutProps, dialogsProps } = useProjectEditorViewState(model, rest)
  return (
    <>
      <WindowTitlebar />
      <main class={buildShellClassName(model)}>
        <ProjectEditorConflictOverlays model={model} />
        <ProjectEditorLayout {...layoutProps} />
        <ProjectEditorDialogs {...dialogsProps} />
      </main>
    </>
  )
}
