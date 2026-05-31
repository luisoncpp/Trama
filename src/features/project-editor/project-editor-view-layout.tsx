import type { BookExportFormat } from '../../shared/ipc'
import type { ResolvedTheme, ThemePreference } from '../../theme/theme-types'
import type { ProjectEditorModel } from './project-editor-types'
import { ProjectEditorSidebarShell } from './project-editor-shell'
import type { ProjectEditorShellActions, ProjectEditorShellState } from './project-editor-shell-props'
import { WorkspaceLayoutPanel } from './pane'

interface ProjectEditorMainPaneProps {
  model: ProjectEditorModel
  spellcheckEnabled: boolean
}

interface ProjectEditorLayoutProps {
  model: ProjectEditorModel
  shellState: ProjectEditorShellState
  shellActions: ProjectEditorShellActions
  effectiveCollapsed: boolean
  sidebarStyle: { '--sidebar-width': string }
  themePreference: ThemePreference
  resolvedTheme: ResolvedTheme
  onThemePreferenceChange: (preference: ThemePreference) => void
  spellcheckEnabled: boolean
  spellcheckLanguage: string | null
  spellcheckLanguageOptions: string[]
  spellcheckLanguageSelectionSupported: boolean
  onSpellcheckEnabledChange: (enabled: boolean) => void
  onSpellcheckLanguageChange: (language: string) => void
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

export function ProjectEditorLayout({
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
  onImportClick,
  onImportZuluClick,
  onBookExportClick,
  onExportClick,
}: ProjectEditorLayoutProps) {
  return (
    <div class="editor-app">
      <section class="editor-workspace" style={sidebarStyle}>
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
        <ProjectEditorMainPane model={model} spellcheckEnabled={spellcheckEnabled} />
      </section>
    </div>
  )
}
