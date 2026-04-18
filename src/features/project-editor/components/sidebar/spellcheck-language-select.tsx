interface SpellcheckLanguageSelectProps {
  spellcheckEnabled: boolean
  spellcheckLanguage: string | null
  spellcheckLanguageOptions: string[]
  onSpellcheckLanguageChange: (language: string) => void
}

export function SpellcheckLanguageSelect({
  spellcheckEnabled,
  spellcheckLanguage,
  spellcheckLanguageOptions,
  onSpellcheckLanguageChange,
}: SpellcheckLanguageSelectProps) {
  return (
    <>
      <select
        value={spellcheckLanguage ?? ''}
        disabled={!spellcheckEnabled || spellcheckLanguageOptions.length === 0}
        onChange={(event) =>
          onSpellcheckLanguageChange((event.currentTarget as HTMLSelectElement).value)
        }
      >
        {spellcheckLanguageOptions.map((languageCode) => (
          <option key={languageCode} value={languageCode}>
            {languageCode}
          </option>
        ))}
      </select>
      <span class="project-menu__field-note">Language used by the native spellchecker.</span>
    </>
  )
}
