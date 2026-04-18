import type { FocusScope } from '../../project-editor-types'
import { FocusScopeSelect } from './focus-scope-select'

interface FocusScopeSettingProps {
  focusScope: FocusScope
  onFocusScopeChange: (scope: FocusScope) => void
}

export function FocusScopeSetting({ focusScope, onFocusScopeChange }: FocusScopeSettingProps) {
  return (
    <div class="project-menu">
      <FocusScopeSelect focusScope={focusScope} onFocusScopeChange={onFocusScopeChange} />
    </div>
  )
}
