import type { FocusScope } from '../../project-editor-types'

interface FocusScopeSelectProps {
  focusScope: FocusScope
  onFocusScopeChange: (scope: FocusScope) => void
}

export function FocusScopeSelect({ focusScope, onFocusScopeChange }: FocusScopeSelectProps) {
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
