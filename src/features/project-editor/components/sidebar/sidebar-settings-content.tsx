import type { ResolvedTheme, ThemePreference } from '../../../../theme/theme-types'
import type { FocusScope } from '../../project-editor-types'

interface SidebarSettingsContentProps {
  panelWidth: number
  onPanelWidthChange: (width: number) => void
  themePreference: ThemePreference
  resolvedTheme: ResolvedTheme
  onThemePreferenceChange: (preference: ThemePreference) => void
  focusScope: FocusScope
  onFocusScopeChange: (scope: FocusScope) => void
}

const THEME_OPTIONS: Array<{ value: ThemePreference; label: string }> = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'System' },
]

function ThemePreferenceButtons({
  themePreference,
  onThemePreferenceChange,
}: Pick<SidebarSettingsContentProps, 'themePreference' | 'onThemePreferenceChange'>) {
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
      <span>Focus Scope</span>
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
          <FocusScopeSelect focusScope={focusScope} onFocusScopeChange={onFocusScopeChange} />
          <PanelWidthControl panelWidth={panelWidth} onPanelWidthChange={onPanelWidthChange} />
        </div>
      </aside>
    </div>
  )
}
