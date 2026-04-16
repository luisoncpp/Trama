import type { ResolvedTheme, ThemePreference } from '../../../../theme/theme-types'
import type { FocusScope } from '../../project-editor-types'

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

const THEME_OPTIONS: Array<{ value: ThemePreference; label: string }> = [{ value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }, { value: 'system', label: 'System' }]

function ThemePreferenceButtons({ themePreference, onThemePreferenceChange }: Pick<SidebarSettingsContentProps, 'themePreference' | 'onThemePreferenceChange'>) {
  return (
    <div class="theme-preference-group" role="radiogroup" aria-label="Theme preference">
      {THEME_OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          class={`editor-button editor-button--secondary editor-button--inline theme-preference-option ${
            themePreference === option.value ? 'is-active' : ''
          }`}
          aria-pressed={themePreference === option.value}
          onClick={() => onThemePreferenceChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

function FocusScopeSelect({
  focusScope,
  onFocusScopeChange,
}: Pick<SidebarSettingsContentProps, 'focusScope' | 'onFocusScopeChange'>) {
  return (
    <label class="project-menu__field">
      <span>Focus Mode Scope</span>
      <select
        value={focusScope}
        onChange={(event) =>
          onFocusScopeChange((event.currentTarget as HTMLSelectElement).value as FocusScope)
        }
      >
        <option value="line">Line</option>
        <option value="sentence">Sentence</option>
        <option value="paragraph">Paragraph</option>
      </select>
    </label>
  )
}

function SpellcheckLanguageSelect({ spellcheckEnabled, spellcheckLanguage, spellcheckLanguageOptions, onSpellcheckLanguageChange }: Pick<SidebarSettingsContentProps, 'spellcheckEnabled' | 'spellcheckLanguage' | 'spellcheckLanguageOptions' | 'onSpellcheckLanguageChange'>) {
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

function SpellcheckControls({
  spellcheckEnabled,
  spellcheckLanguage,
  spellcheckLanguageOptions,
  spellcheckLanguageSelectionSupported,
  onSpellcheckEnabledChange,
  onSpellcheckLanguageChange,
}: Pick<
  SidebarSettingsContentProps,
  | 'spellcheckEnabled'
  | 'spellcheckLanguage'
  | 'spellcheckLanguageOptions'
  | 'spellcheckLanguageSelectionSupported'
  | 'onSpellcheckEnabledChange'
  | 'onSpellcheckLanguageChange'
>) {
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

function PanelWidthControl({
  panelWidth,
  onPanelWidthChange,
}: Pick<SidebarSettingsContentProps, 'panelWidth' | 'onPanelWidthChange'>) {
  return (
    <label class="project-menu__field">
      <span>Panel width: {panelWidth}px</span>
      <input
        type="range"
        min={260}
        max={460}
        step={10}
        value={panelWidth}
        onInput={(event) =>
          onPanelWidthChange(Number((event.currentTarget as HTMLInputElement).value))
        }
      />
    </label>
  )
}

export function SidebarSettingsContent({
  panelWidth,
  onPanelWidthChange,
  themePreference,
  resolvedTheme,
  onThemePreferenceChange,
  spellcheckEnabled,
  spellcheckLanguage,
  spellcheckLanguageOptions,
  spellcheckLanguageSelectionSupported,
  onSpellcheckEnabledChange,
  onSpellcheckLanguageChange,
  focusScope,
  onFocusScopeChange,
}: SidebarSettingsContentProps) {
  return (
    <div class="sidebar-panel-content">
      <aside class="workspace-panel workspace-panel--sidebar">
        <div class="workspace-panel__header">
          <div>
            <p class="workspace-panel__eyebrow">Settings</p>
          </div>
        </div>
        <div class="project-menu">
          <label class="project-menu__field">
            <span>Theme</span>
            <ThemePreferenceButtons
              themePreference={themePreference}
              onThemePreferenceChange={onThemePreferenceChange}
            />
            <span class="project-menu__field-note">
              Resolved now: {resolvedTheme === 'dark' ? 'Dark' : 'Light'}
            </span>
          </label>
        </div>
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
        <div class="project-menu">
          <FocusScopeSelect focusScope={focusScope} onFocusScopeChange={onFocusScopeChange} />
        </div>
        <div class="project-menu">
          <PanelWidthControl panelWidth={panelWidth} onPanelWidthChange={onPanelWidthChange} />
        </div>
      </aside>
    </div>
  )
}
