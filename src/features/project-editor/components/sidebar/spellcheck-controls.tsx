import { SpellcheckLanguageSelect } from './spellcheck-language-select'

interface SpellcheckControlsProps {
  spellcheckEnabled: boolean
  spellcheckLanguage: string | null
  spellcheckLanguageOptions: string[]
  spellcheckLanguageSelectionSupported: boolean
  onSpellcheckEnabledChange: (enabled: boolean) => void
  onSpellcheckLanguageChange: (language: string) => void
}

export function SpellcheckControls({
  spellcheckEnabled,
  spellcheckLanguage,
  spellcheckLanguageOptions,
  spellcheckLanguageSelectionSupported,
  onSpellcheckEnabledChange,
  onSpellcheckLanguageChange,
}: SpellcheckControlsProps) {
  return (
    <div class="project-menu__field">
      <span>Spellcheck</span>
      <label class="project-menu__checkbox">
        <input
          type="checkbox"
          checked={spellcheckEnabled}
          onChange={(event) =>
            onSpellcheckEnabledChange((event.currentTarget as HTMLInputElement).checked)
          }
        />
        <span>Enable spellcheck suggestions</span>
      </label>
      {spellcheckLanguageSelectionSupported ? (
        <SpellcheckLanguageSelect
          spellcheckEnabled={spellcheckEnabled}
          spellcheckLanguage={spellcheckLanguage}
          spellcheckLanguageOptions={spellcheckLanguageOptions}
          onSpellcheckLanguageChange={onSpellcheckLanguageChange}
        />
      ) : (
        <span class="project-menu__field-note">
          Language selection is managed by the operating system on this platform.
        </span>
      )}
    </div>
  )
}
