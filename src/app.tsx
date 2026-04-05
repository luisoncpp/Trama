import { ProjectEditorView } from './features/project-editor/project-editor-view'
import { useProjectEditor } from './features/project-editor/use-project-editor'
import { useThemePreference } from './theme/use-theme-preference'

export function App() {
  const model = useProjectEditor()
  const theme = useThemePreference()

  return (
    <ProjectEditorView
      model={model}
      themePreference={theme.preference}
      resolvedTheme={theme.resolvedTheme}
      onThemePreferenceChange={theme.setPreference}
    />
  )
}
