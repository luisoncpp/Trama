import { useRef } from 'preact/hooks'
import type { FilteredTemplate } from '../../../templates/templates-catalog-private/filter-template-paths'
import { useTemplatePickerCombobox } from './use-template-picker-combobox'
import { TemplatePickerDropdown } from './template-picker-dropdown.tsx'

interface TemplatePickerComboboxProps {
  filteredTemplates: FilteredTemplate[]
  searchQuery: string
  selectedPath: string | null
  onSearchChange: (value: string) => void
  onSelect: (path: string | null) => void
}

export function TemplatePickerCombobox({
  filteredTemplates, searchQuery, selectedPath, onSearchChange, onSelect,
}: TemplatePickerComboboxProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const listRef = useRef<HTMLUListElement | null>(null)

  const {
    isOpen, setIsOpen, highlightedIndex, setHighlightedIndex,
    selectItem, handleInputKeyDown, handleFocus,
  } = useTemplatePickerCombobox(
    filteredTemplates, onSelect, containerRef,
  )

  const selectedName = selectedPath ? filteredTemplates.find((t) => t.path === selectedPath)?.name ?? '' : ''

  return (
    <div class="template-picker" ref={containerRef}>
      <label class="sidebar-create-dialog__field template-picker__field">
        <span>Template (optional)</span>
        <input
          ref={inputRef} type="search" class="template-picker__input"
          value={isOpen ? searchQuery : (selectedPath ? selectedName : '')}
          placeholder="Search templates..."
          onInput={(e) => { onSearchChange(e.currentTarget.value); setIsOpen(true); setHighlightedIndex(-1) }}
          onFocus={handleFocus} onKeyDown={handleInputKeyDown} autocomplete="off"
        />
      </label>
      {isOpen && (
        <TemplatePickerDropdown
          displayedTemplates={filteredTemplates} selectedPath={selectedPath}
          highlightedIndex={highlightedIndex} searchQuery={searchQuery}
          onSelect={selectItem} onHoverIndex={setHighlightedIndex} listRef={listRef}
        />
      )}
    </div>
  )
}
