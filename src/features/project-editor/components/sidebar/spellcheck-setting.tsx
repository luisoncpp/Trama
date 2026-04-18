import { SpellcheckControls } from './spellcheck-controls'

interface SpellcheckSettingProps {
  spellcheckEnabled: boolean
  spellcheckLanguage: string | null
  spellcheckLanguageOptions: string[]
  spellcheckLanguageSelectionSupported: boolean
  onSpellcheckEnabledChange: (enabled: boolean) => void
  onSpellcheckLanguageChange: (language: string) => void
}

export function SpellcheckSetting({
  spellcheckEnabled,
  spellcheckLanguage,
  spellcheckLanguageOptions,
  spellcheckLanguageSelectionSupported,
  onSpellcheckEnabledChange,
  onSpellcheckLanguageChange,
}: SpellcheckSettingProps) {
  return (
    <div class="project-menu">
      <SpellcheckControls
        spellcheckEnabled={spellcheckEnabled}
        spellcheckLanguage={spellcheckLanguage}
        spellcheckLanguageOptions={spellcheckLanguageOptions}
        spellcheckLanguageSelectionSupported={spellcheckLanguageSelectionSupported}
        onSpellcheckEnabledChange={onSpellcheckEnabledChange}
        onSpellcheckLanguageChange={onSpellcheckLanguageChange}
      />
    </div>
  )
}
