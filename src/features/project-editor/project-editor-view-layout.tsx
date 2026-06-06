import { useRef } from 'preact/hooks'
import type { BookExportFormat } from '../../shared/ipc'
import type { ProjectEditorModel } from './project-editor-types'
import { ProjectEditorSidebarShell } from './project-editor-shell'
import type { ProjectEditorShellActions, ProjectEditorShellSettingsProps, ProjectEditorShellState } from './project-editor-shell-props'
import { SidebarResizeHandle } from './layout/sidebar-resize-handle'
import { WorkspaceLayoutPanel } from './pane'

interface ProjectEditorMainPaneProps {
  model: ProjectEditorModel
  spellcheckEnabled: boolean
}

interface ProjectEditorLayoutProps extends ProjectEditorShellSettingsProps {
  model: ProjectEditorModel
  shellState: ProjectEditorShellState
  shellActions: ProjectEditorShellActions
  effectiveCollapsed: boolean
  sidebarStyle: { '--sidebar-width': string }
  onImportClick: () => void
  onImportZuluClick: () => void
  onBookExportClick: (format: BookExportFormat) => void
  onExportClick: () => void
}

function ProjectEditorMainPane({ model, spellcheckEnabled }: ProjectEditorMainPaneProps) {
  return (
    <div class="editor-main editor-fill-column">
      <WorkspaceLayoutPanel model={model} spellcheckEnabled={spellcheckEnabled} />
    </div>
  )
}

type ProjectEditorSidebarColumnProps = Omit<ProjectEditorLayoutProps, 'model' | 'sidebarStyle'>

function ProjectEditorSidebarColumn({
  shellState,
  shellActions,
  effectiveCollapsed,
  themePreference,
  resolvedTheme,
  onThemePreferenceChange,
  spellcheckEnabled,
  spellcheckLanguage,
  spellcheckLanguageOptions,
  spellcheckLanguageSelectionSupported,
  onSpellcheckEnabledChange,
  onSpellcheckLanguageChange,
  onImportClick,
  onImportZuluClick,
  onBookExportClick,
  onExportClick,
}: ProjectEditorSidebarColumnProps) {
  return (
    <div class="sidebar-column">
      <ProjectEditorSidebarShell
        shellState={shellState}
        shellActions={shellActions}
        effectiveCollapsed={effectiveCollapsed}
        themePreference={themePreference}
        resolvedTheme={resolvedTheme}
        onThemePreferenceChange={onThemePreferenceChange}
        spellcheckEnabled={spellcheckEnabled}
        spellcheckLanguage={spellcheckLanguage}
        spellcheckLanguageOptions={spellcheckLanguageOptions}
        spellcheckLanguageSelectionSupported={spellcheckLanguageSelectionSupported}
        onSpellcheckEnabledChange={onSpellcheckEnabledChange}
        onSpellcheckLanguageChange={onSpellcheckLanguageChange}
        onImportClick={onImportClick}
        onImportZuluClick={onImportZuluClick}
        onBookExportClick={onBookExportClick}
        onExportClick={onExportClick}
      />
    </div>
  )
}

function ProjectEditorWorkspace(props: ProjectEditorLayoutProps & {
  workspaceRef: { current: HTMLElement | null }
  showSidebarResizeHandle: boolean
}) {
  const { model, shellState, shellActions, effectiveCollapsed, sidebarStyle, spellcheckEnabled, showSidebarResizeHandle, workspaceRef } = props

  return (
    <section class="editor-workspace" style={sidebarStyle} ref={workspaceRef}>
      <ProjectEditorSidebarColumn
        shellState={shellState}
        shellActions={shellActions}
        effectiveCollapsed={effectiveCollapsed}
        themePreference={props.themePreference}
        resolvedTheme={props.resolvedTheme}
        onThemePreferenceChange={props.onThemePreferenceChange}
        spellcheckEnabled={spellcheckEnabled}
        spellcheckLanguage={props.spellcheckLanguage}
        spellcheckLanguageOptions={props.spellcheckLanguageOptions}
        spellcheckLanguageSelectionSupported={props.spellcheckLanguageSelectionSupported}
        onSpellcheckEnabledChange={props.onSpellcheckEnabledChange}
        onSpellcheckLanguageChange={props.onSpellcheckLanguageChange}
        onImportClick={props.onImportClick}
        onImportZuluClick={props.onImportZuluClick}
        onBookExportClick={props.onBookExportClick}
        onExportClick={props.onExportClick}
      />
      {showSidebarResizeHandle && (
        <SidebarResizeHandle
          workspaceRef={workspaceRef}
          onWidthChange={shellActions.setSidebarPanelWidth}
        />
      )}
      <ProjectEditorMainPane model={model} spellcheckEnabled={spellcheckEnabled} />
    </section>
  )
}

export function ProjectEditorLayout(props: ProjectEditorLayoutProps) {
  const workspaceRef = useRef<HTMLElement>(null)
  const showSidebarResizeHandle = !props.effectiveCollapsed && !props.shellState.workspaceLayout.focusModeEnabled

  return (
    <div class="editor-app">
      <ProjectEditorWorkspace
        {...props}
        workspaceRef={workspaceRef}
        showSidebarResizeHandle={showSidebarResizeHandle}
      />
    </div>
  )
}
