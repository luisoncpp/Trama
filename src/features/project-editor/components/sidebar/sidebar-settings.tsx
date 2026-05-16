import type { ComponentChildren } from 'preact'
import type { ResolvedTheme, ThemePreference } from '../../../../theme/theme-types'
import type { FocusScope } from '../../project-editor-types'

interface SettingsFieldProps {
  label: string
  children: ComponentChildren
  note?: string
}
function SettingsField({ label, children, note }: SettingsFieldProps) {
  return (
    <div class="project-menu">
      <label class="project-menu__field">
        <span>{label}</span>
        {children}
        {note && <span class="project-menu__field-note">{note}</span>}
      </label>
    </div>
  )
}

interface SidebarSettingsContentProps {
  panelWidth: number
  onPanelWidthChange: (width: number) => void
  themePreference: ThemePreference
  resolvedTheme: ResolvedTheme
  onThemePreferenceChange: (preference: ThemePreference) => void
  spellcheckEnabled: boolean
  spellcheckLanguage: string | null
  spellcheckLanguageOptions: string[]
  spellcheckLanguageSelectionSupported: boolean
  onSpellcheckEnabledChange: (enabled: boolean) => void
  onSpellcheckLanguageChange: (language: string) => void
  focusScope: FocusScope
  onFocusScopeChange: (scope: FocusScope) => void
}

export function SidebarSettingsContent({
  panelWidth, onPanelWidthChange,
  themePreference, resolvedTheme, onThemePreferenceChange,
  spellcheckEnabled, spellcheckLanguage, spellcheckLanguageOptions,
  spellcheckLanguageSelectionSupported, onSpellcheckEnabledChange, onSpellcheckLanguageChange,
  focusScope, onFocusScopeChange,
}: SidebarSettingsContentProps) {
  return (
    <div class="sidebar-panel-content">
      <aside class="workspace-panel workspace-panel--sidebar">
        <div class="workspace-panel__header">
          <div><p class="workspace-panel__eyebrow">Settings</p></div>
        </div>
        <SettingsField label="Theme" note={`Resolved now: ${resolvedTheme === 'dark' ? 'Dark' : 'Light'}`}>
          <ThemePreferenceButtons themePreference={themePreference} onThemePreferenceChange={onThemePreferenceChange} />
        </SettingsField>
        <SettingsField label="Spellcheck">
          <SpellcheckControls spellcheckEnabled={spellcheckEnabled} spellcheckLanguage={spellcheckLanguage}
            spellcheckLanguageOptions={spellcheckLanguageOptions}
            spellcheckLanguageSelectionSupported={spellcheckLanguageSelectionSupported}
            onSpellcheckEnabledChange={onSpellcheckEnabledChange} onSpellcheckLanguageChange={onSpellcheckLanguageChange} />
        </SettingsField>
        <SettingsField label="Focus Mode Scope">
          <FocusScopeSelect focusScope={focusScope} onFocusScopeChange={onFocusScopeChange} />
        </SettingsField>
        <SettingsField label={`Panel width: ${panelWidth}px`}>
          <PanelWidthControl panelWidth={panelWidth} onPanelWidthChange={onPanelWidthChange} />
        </SettingsField>
      </aside>
    </div>
  )
}

const THEME_OPTIONS: Array<{ value: ThemePreference; label: string }> = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'System' },
]
interface ThemePreferenceButtonsProps {
  themePreference: ThemePreference
  onThemePreferenceChange: (preference: ThemePreference) => void
}
function ThemePreferenceButtons({ themePreference, onThemePreferenceChange }: ThemePreferenceButtonsProps) {
  return (
    <div class="theme-preference-group" role="radiogroup" aria-label="Theme preference">
      {THEME_OPTIONS.map((option) => (
        <button key={option.value} type="button"
          class={`editor-button editor-button--secondary editor-button--inline theme-preference-option ${themePreference === option.value ? 'is-active' : ''}`}
          aria-pressed={themePreference === option.value}
          onClick={() => onThemePreferenceChange(option.value)}>
          {option.label}
        </button>
      ))}
    </div>
  )
}

interface SpellcheckControlsProps {
  spellcheckEnabled: boolean
  spellcheckLanguage: string | null
  spellcheckLanguageOptions: string[]
  spellcheckLanguageSelectionSupported: boolean
  onSpellcheckEnabledChange: (enabled: boolean) => void
  onSpellcheckLanguageChange: (language: string) => void
}
function SpellcheckControls({
  spellcheckEnabled, spellcheckLanguage, spellcheckLanguageOptions,
  spellcheckLanguageSelectionSupported, onSpellcheckEnabledChange, onSpellcheckLanguageChange,
}: SpellcheckControlsProps) {
  return (
    <>
      <label class="project-menu__checkbox">
        <input type="checkbox" checked={spellcheckEnabled}
          onChange={(event) => onSpellcheckEnabledChange((event.currentTarget as HTMLInputElement).checked)} />
        <span>Enable spellcheck suggestions</span>
      </label>
      {spellcheckLanguageSelectionSupported ? (
        <SpellcheckLanguageSelect spellcheckEnabled={spellcheckEnabled} spellcheckLanguage={spellcheckLanguage}
          spellcheckLanguageOptions={spellcheckLanguageOptions} onSpellcheckLanguageChange={onSpellcheckLanguageChange} />
      ) : (
        <span class="project-menu__field-note">Language selection is managed by the operating system on this platform.</span>
      )}
    </>
  )
}

interface SpellcheckLanguageSelectProps {
  spellcheckEnabled: boolean
  spellcheckLanguage: string | null
  spellcheckLanguageOptions: string[]
  onSpellcheckLanguageChange: (language: string) => void
}
function SpellcheckLanguageSelect({
  spellcheckEnabled, spellcheckLanguage, spellcheckLanguageOptions, onSpellcheckLanguageChange,
}: SpellcheckLanguageSelectProps) {
  return (
    <>
      <select value={spellcheckLanguage ?? ''} disabled={!spellcheckEnabled || spellcheckLanguageOptions.length === 0}
        onChange={(event) => onSpellcheckLanguageChange((event.currentTarget as HTMLSelectElement).value)}>
        {spellcheckLanguageOptions.map((languageCode) => (
          <option key={languageCode} value={languageCode}>{languageCode}</option>
        ))}
      </select>
      <span class="project-menu__field-note">Language used by the native spellchecker.</span>
    </>
  )
}

interface FocusScopeSelectProps {
  focusScope: FocusScope
  onFocusScopeChange: (scope: FocusScope) => void
}
function FocusScopeSelect({ focusScope, onFocusScopeChange }: FocusScopeSelectProps) {
  return (
    <select value={focusScope}
      onChange={(event) => onFocusScopeChange((event.currentTarget as HTMLSelectElement).value as FocusScope)}>
      <option value="line">Line</option>
      <option value="sentence">Sentence</option>
      <option value="paragraph">Paragraph</option>
    </select>
  )
}

interface PanelWidthControlProps {
  panelWidth: number
  onPanelWidthChange: (width: number) => void
}
function PanelWidthControl({ panelWidth, onPanelWidthChange }: PanelWidthControlProps) {
  return (
    <input type="range" min={260} max={460} step={10} value={panelWidth}
      onInput={(event) => onPanelWidthChange(Number((event.currentTarget as HTMLInputElement).value))} />
  )
}
