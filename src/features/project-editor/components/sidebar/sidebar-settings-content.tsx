import type { ResolvedTheme, ThemePreference } from '../../../../theme/theme-types'
import type { FocusScope } from '../../project-editor-types'
import { ThemeSetting } from './theme-setting'
import { SpellcheckSetting } from './spellcheck-setting'
import { FocusScopeSetting } from './focus-scope-setting'
import { PanelWidthSetting } from './panel-width-setting'

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
        <ThemeSetting
          themePreference={themePreference}
          resolvedTheme={resolvedTheme}
          onThemePreferenceChange={onThemePreferenceChange}
        />
        <SpellcheckSetting
          spellcheckEnabled={spellcheckEnabled}
          spellcheckLanguage={spellcheckLanguage}
          spellcheckLanguageOptions={spellcheckLanguageOptions}
          spellcheckLanguageSelectionSupported={spellcheckLanguageSelectionSupported}
          onSpellcheckEnabledChange={onSpellcheckEnabledChange}
          onSpellcheckLanguageChange={onSpellcheckLanguageChange}
        />
        <FocusScopeSetting focusScope={focusScope} onFocusScopeChange={onFocusScopeChange} />
        <PanelWidthSetting panelWidth={panelWidth} onPanelWidthChange={onPanelWidthChange} />
      </aside>
    </div>
  )
}
