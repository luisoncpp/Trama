import { ProjectEditorView } from './features/project-editor/project-editor-view'
import { useProjectEditor } from './features/project-editor/use-project-editor'
import { useSpellcheckSettings } from './spellcheck/use-spellcheck-settings'
import { useThemePreference } from './theme/use-theme-preference'

export function App() {
  const model = useProjectEditor()
  const theme = useThemePreference()
  const spellcheck = useSpellcheckSettings()

  return (
    <ProjectEditorView
      model={model}
      themePreference={theme.preference}
      resolvedTheme={theme.resolvedTheme}
      onThemePreferenceChange={theme.setPreference}
      spellcheckEnabled={spellcheck.settings.enabled}
      spellcheckLanguage={spellcheck.settings.selectedLanguage}
      spellcheckLanguageOptions={spellcheck.settings.availableLanguages}
      spellcheckLanguageSelectionSupported={spellcheck.settings.supportsLanguageSelection}
      onSpellcheckEnabledChange={(enabled) => void spellcheck.setEnabled(enabled)}
      onSpellcheckLanguageChange={(language) => void spellcheck.setLanguage(language)}
    />
  )
}
