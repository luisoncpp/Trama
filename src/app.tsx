import { useCallback } from 'preact/hooks'
import { ProjectEditorView } from './features/project-editor/project-editor-view'
import { useProjectEditor } from './features/project-editor/use-project-editor'
import { useSpellcheckSettings } from './spellcheck/use-spellcheck-settings'
import { useThemePreference } from './theme/use-theme-preference'

export function App() {
  const model = useProjectEditor()
  const theme = useThemePreference()
  const spellcheck = useSpellcheckSettings()
  const handleSpellcheckEnabledChange = useCallback(/* handleSpellcheckEnabledChange */ (enabled: boolean) => {
    void spellcheck.setEnabled(enabled)
  }, [spellcheck.setEnabled] /*Inputs for handleSpellcheckEnabledChange*/)
  const handleSpellcheckLanguageChange = useCallback(/* handleSpellcheckLanguageChange */ (language: string) => {
    void spellcheck.setLanguage(language)
  }, [spellcheck.setLanguage] /*Inputs for handleSpellcheckLanguageChange*/)

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
      onSpellcheckEnabledChange={handleSpellcheckEnabledChange}
      onSpellcheckLanguageChange={handleSpellcheckLanguageChange}
    />
  )
}
