import type { ProjectEditorModel } from './project-editor-types'
import { ConflictBanner } from './components/conflict-banner'
import { ConflictComparePanel } from './components/conflict-compare-panel'
import { ProjectEditorDialogs } from './project-editor-dialogs'
import { useProjectEditorShellActions, useProjectEditorShellState } from './project-editor-shell'
import { useProjectEditorViewDialogs } from './project-editor-view-dialogs'
import { ProjectEditorLayout } from './project-editor-view-layout'
import type { ResolvedTheme, ThemePreference } from '../../theme/theme-types'
import type { BookExportFormat } from '../../shared/ipc'
import type { ProjectEditorShellActions, ProjectEditorShellState } from './project-editor-shell-props'
import { useSidebarLayout } from './layout/use-sidebar-layout'
import { WindowTitlebar } from './window-titlebar'

interface ProjectEditorViewProps {
  model: ProjectEditorModel
  themePreference: ThemePreference
  resolvedTheme: ResolvedTheme
  onThemePreferenceChange: (preference: ThemePreference) => void
  spellcheckEnabled: boolean
  spellcheckLanguage: string | null
  spellcheckLanguageOptions: string[]
  spellcheckLanguageSelectionSupported: boolean
  onSpellcheckEnabledChange: (enabled: boolean) => void
  onSpellcheckLanguageChange: (language: string) => void
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

function buildProjectEditorLayoutProps(
  model: ProjectEditorModel,
  shellState: ProjectEditorShellState,
  shellActions: ProjectEditorShellActions,
  effectiveCollapsed: boolean,
  sidebarStyle: ReturnType<typeof buildSidebarStyle>,
  themePreference: ThemePreference,
  resolvedTheme: ResolvedTheme,
  onThemePreferenceChange: (preference: ThemePreference) => void,
  spellcheckEnabled: boolean,
  spellcheckLanguage: string | null,
  spellcheckLanguageOptions: string[],
  spellcheckLanguageSelectionSupported: boolean,
  onSpellcheckEnabledChange: (enabled: boolean) => void,
  onSpellcheckLanguageChange: (language: string) => void,
  openAiImport: () => void,
  openZuluImport: () => void,
  openBookExport: (format: BookExportFormat) => void,
  openAiExport: () => void,
) {
  return {
    model,
    shellState,
    shellActions,
    effectiveCollapsed,
    sidebarStyle,
    themePreference,
    resolvedTheme,
    onThemePreferenceChange,
    spellcheckEnabled,
    spellcheckLanguage,
    spellcheckLanguageOptions,
    spellcheckLanguageSelectionSupported,
    onSpellcheckEnabledChange,
    onSpellcheckLanguageChange,
    onImportClick: openAiImport,
    onImportZuluClick: openZuluImport,
    onBookExportClick: openBookExport,
    onExportClick: openAiExport,
  }
}

function useProjectEditorViewState(model: ProjectEditorModel, props: Omit<ProjectEditorViewProps, 'model'>) {
  const shellState = useProjectEditorShellState(model)
  const shellActions = useProjectEditorShellActions(model)
  const { effectiveCollapsed, sidebarWidthPx } = useSidebarLayout({
    sidebarPanelCollapsed: shellState.sidebarPanelCollapsed,
    sidebarPanelWidth: shellState.sidebarPanelWidth,
  })
  const { dialogsProps, openAiImport, openZuluImport, openAiExport, openBookExport } = useProjectEditorViewDialogs(
    shellState.rootPath,
    shellState.visibleFiles,
  )
  const sidebarStyle = buildSidebarStyle(sidebarWidthPx)
  const layoutProps = buildProjectEditorLayoutProps(
    model, shellState, shellActions, effectiveCollapsed, sidebarStyle,
    props.themePreference, props.resolvedTheme, props.onThemePreferenceChange,
    props.spellcheckEnabled, props.spellcheckLanguage, props.spellcheckLanguageOptions,
    props.spellcheckLanguageSelectionSupported, props.onSpellcheckEnabledChange,
    props.onSpellcheckLanguageChange,
    openAiImport, openZuluImport, openBookExport, openAiExport,
  )
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
