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

function buildSidebarStyle(sidebarPanelCollapsed: boolean, sidebarPanelWidth: number, focusModeEnabled: boolean) {
  return {
    '--sidebar-width': focusModeEnabled ? '0px' : `${sidebarPanelCollapsed ? 72 : sidebarPanelWidth}px`,
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

export function ProjectEditorView({
  model,
  themePreference,
  resolvedTheme,
  onThemePreferenceChange,
  spellcheckEnabled,
  spellcheckLanguage,
  spellcheckLanguageOptions,
  spellcheckLanguageSelectionSupported,
  onSpellcheckEnabledChange,
  onSpellcheckLanguageChange,
}: ProjectEditorViewProps) {
  const shellState = useProjectEditorShellState(model)
  const shellActions = useProjectEditorShellActions(model)
  const { dialogsProps, openAiImport, openZuluImport, openAiExport, openBookExport } = useProjectEditorViewDialogs(
    shellState.rootPath,
    shellState.visibleFiles,
  )
  const sidebarStyle = buildSidebarStyle(
    shellState.sidebarPanelCollapsed,
    shellState.sidebarPanelWidth,
    shellState.workspaceLayout.focusModeEnabled,
  )
  const layoutProps = buildProjectEditorLayoutProps(
    model,
    shellState,
    shellActions,
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
    openAiImport,
    openZuluImport,
    openBookExport,
    openAiExport,
  )

  return (
    <main class={buildShellClassName(model)}>
      <ProjectEditorConflictOverlays model={model} />
      <ProjectEditorLayout {...layoutProps} />
      <ProjectEditorDialogs {...dialogsProps} />
    </main>
  )
}
