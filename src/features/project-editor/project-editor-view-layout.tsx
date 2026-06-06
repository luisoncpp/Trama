import { useRef } from 'preact/hooks'
import type { ProjectEditorModel } from './project-editor-types'
import { ProjectEditorSidebarShell } from './project-editor-shell'
import type { ProjectEditorDialogsProps } from './project-editor-dialogs'
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
  dialogsProps: ProjectEditorDialogsProps
}

function ProjectEditorMainPane({ model, spellcheckEnabled }: ProjectEditorMainPaneProps) {
  return (
    <div class="editor-main editor-fill-column">
      <WorkspaceLayoutPanel model={model} spellcheckEnabled={spellcheckEnabled} />
    </div>
  )
}

type ProjectEditorSidebarColumnProps = Omit<ProjectEditorLayoutProps, 'model' | 'sidebarStyle'>

function ProjectEditorSidebarColumn(
  props: ProjectEditorSidebarColumnProps,
) {
  return (
    <div class="sidebar-column">
      <ProjectEditorSidebarShell
        {...props}
      />
    </div>
  )
}

function ProjectEditorWorkspace(props: ProjectEditorLayoutProps & {
  workspaceRef: { current: HTMLElement | null }
  showSidebarResizeHandle: boolean
}) {
  const {
    model, shellState, shellActions, effectiveCollapsed, sidebarStyle,
    spellcheckEnabled, showSidebarResizeHandle, workspaceRef,
    themePreference, resolvedTheme, onThemePreferenceChange,
    spellcheckLanguage, spellcheckLanguageOptions, spellcheckLanguageSelectionSupported,
    onSpellcheckEnabledChange, onSpellcheckLanguageChange, dialogsProps,
  } = props

  return (
    <section class="editor-workspace" style={sidebarStyle} ref={workspaceRef}>
      <ProjectEditorSidebarColumn
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
        dialogsProps={dialogsProps}
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
