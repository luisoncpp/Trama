import type { FilteredTemplate } from '../../../templates/templates-catalog-private/filter-template-paths'

interface TemplatePickerDropdownProps {
  displayedTemplates: FilteredTemplate[]
  selectedPath: string | null
  highlightedIndex: number
  searchQuery: string
  onSelect: (path: string | null) => void
  onHoverIndex: (index: number) => void
  listRef: { current: HTMLUListElement | null }
}

export function TemplatePickerDropdown({
  displayedTemplates, selectedPath, highlightedIndex, searchQuery, onSelect, onHoverIndex, listRef,
}: TemplatePickerDropdownProps) {
  return (
    <ul class="template-picker__dropdown" ref={listRef} role="listbox">
      <li
        class={`template-picker__option ${highlightedIndex === 0 ? 'template-picker__option--highlighted' : ''}`}
        role="option" aria-selected={selectedPath === null}
        onMouseDown={(e) => { e.preventDefault(); onSelect(null) }} onMouseEnter={() => onHoverIndex(0)}
      >
        <span class="template-picker__option-name">Blank</span>
        <span class="template-picker__option-sub">No template</span>
      </li>
      {displayedTemplates.map((template, idx) => {
        const itemIndex = idx + 1
        const isSel = selectedPath === template.path
        const isHigh = highlightedIndex === itemIndex
        return (
          <li
            key={template.path}
            class={`template-picker__option ${isHigh ? 'template-picker__option--highlighted' : ''} ${isSel ? 'template-picker__option--selected' : ''}`}
            role="option" aria-selected={isSel}
            onMouseDown={(e) => { e.preventDefault(); onSelect(template.path) }}
            onMouseEnter={() => onHoverIndex(itemIndex)}
          >
            <span class="template-picker__option-name">{template.name}</span>
            <span class="template-picker__option-sub">{template.relativePath}</span>
          </li>
        )
      })}
      {displayedTemplates.length === 0 && searchQuery.length > 0 && (
        <li class="template-picker__option template-picker__option--empty" role="option" aria-disabled="true">
          No templates match "{searchQuery}"
        </li>
      )}
    </ul>
  )
}
