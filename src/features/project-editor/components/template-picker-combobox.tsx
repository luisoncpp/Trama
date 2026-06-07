import { useEffect, useRef, useState } from 'preact/hooks'
import type { FilteredTemplate } from '../templates/templates-catalog-private/filter-template-paths'

interface TemplatePickerComboboxProps {
  filteredTemplates: FilteredTemplate[]
  searchQuery: string
  selectedPath: string | null
  onSearchChange: (value: string) => void
  onSelect: (path: string | null) => void
}

export function TemplatePickerCombobox({
  filteredTemplates,
  searchQuery,
  selectedPath,
  onSearchChange,
  onSelect,
}: TemplatePickerComboboxProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const listRef = useRef<HTMLUListElement | null>(null)

  const displayedTemplates = filteredTemplates
  const totalItems = 1 + displayedTemplates.length

  const close = () => {
    setIsOpen(false)
    setHighlightedIndex(-1)
  }

  const selectItem = (path: string | null) => {
    onSelect(path)
    close()
  }

  useEffect(/* closeOnOutsideClick */ () => {
    if (!isOpen) {
      return undefined
    }

    const handleClick = (event: MouseEvent) => {
      if (containerRef.current?.contains(event.target as Node)) {
        return
      }
      close()
    }

    document.addEventListener('mousedown', handleClick)
    return () => {
      document.removeEventListener('mousedown', handleClick)
    }
  }, [isOpen] /*Inputs for closeOnOutsideClick*/)

  const handleInputKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      close()
      event.preventDefault()
      return
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setIsOpen(true)
      setHighlightedIndex((prev) => (prev + 1 >= totalItems ? 0 : prev + 1))
      return
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault()
      setIsOpen(true)
      setHighlightedIndex((prev) => (prev <= 0 ? totalItems - 1 : prev - 1))
      return
    }

    if (event.key === 'Enter') {
      event.preventDefault()
      if (isOpen && highlightedIndex >= 0 && highlightedIndex < totalItems) {
        if (highlightedIndex === 0) {
          selectItem(null)
        } else {
          const template = displayedTemplates[highlightedIndex - 1]
          if (template) {
            selectItem(template.path)
          }
        }
      }
      return
    }

    if (!isOpen) {
      setIsOpen(true)
    }
  }

  const handleFocus = () => {
    setIsOpen(true)
  }

  const selectedName = selectedPath
    ? displayedTemplates.find((t) => t.path === selectedPath)?.name ?? ''
    : ''

  return (
    <div class="template-picker" ref={containerRef}>
      <label class="sidebar-create-dialog__field template-picker__field">
        <span>Template (optional)</span>
        <input
          ref={inputRef}
          type="search"
          class="template-picker__input"
          value={isOpen ? searchQuery : (selectedPath ? selectedName : '')}
          placeholder="Search templates..."
          onInput={(event) => {
            onSearchChange(event.currentTarget.value)
            setIsOpen(true)
            setHighlightedIndex(-1)
          }}
          onFocus={handleFocus}
          onKeyDown={handleInputKeyDown}
          autocomplete="off"
        />
      </label>
      {isOpen && (
        <ul class="template-picker__dropdown" ref={listRef} role="listbox">
          <li
            class={`template-picker__option ${highlightedIndex === 0 ? 'template-picker__option--highlighted' : ''}`}
            role="option"
            aria-selected={selectedPath === null}
            onMouseDown={(event) => {
              event.preventDefault()
              selectItem(null)
            }}
            onMouseEnter={() => setHighlightedIndex(0)}
          >
            <span class="template-picker__option-name">Blank</span>
            <span class="template-picker__option-sub">No template</span>
          </li>
          {displayedTemplates.map((template, index) => {
            const itemIndex = index + 1
            return (
              <li
                key={template.path}
                class={`template-picker__option ${highlightedIndex === itemIndex ? 'template-picker__option--highlighted' : ''} ${selectedPath === template.path ? 'template-picker__option--selected' : ''}`}
                role="option"
                aria-selected={selectedPath === template.path}
                onMouseDown={(event) => {
                  event.preventDefault()
                  selectItem(template.path)
                }}
                onMouseEnter={() => setHighlightedIndex(itemIndex)}
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
      )}
    </div>
  )
}
