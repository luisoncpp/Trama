import { useEffect, useState } from 'preact/hooks'
import type { FilteredTemplate } from '../../../templates/templates-catalog-private/filter-template-paths'

interface KeyboardNavParams {
  event: KeyboardEvent
  isOpen: boolean
  totalItems: number
  highlightedIndex: number
  displayedTemplates: FilteredTemplate[]
  setIsOpen: (open: boolean) => void
  setHighlightedIndex: (value: number | ((prev: number) => number)) => void
  close: () => void
  selectItem: (path: string | null) => void
}

function handleComboboxKeyboard({
  event, isOpen, totalItems, highlightedIndex, displayedTemplates,
  setIsOpen, setHighlightedIndex, close, selectItem,
}: KeyboardNavParams) {
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

export function useTemplatePickerCombobox(
  displayedTemplates: FilteredTemplate[],
  onSelect: (path: string | null) => void,
  containerRef: { current: HTMLDivElement | null },
) {
  const [isOpen, setIsOpen] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
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
    if (!isOpen) return undefined
    const handleClick = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) close()
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [isOpen] /*Inputs for closeOnOutsideClick*/)

  const handleInputKeyDown = (event: KeyboardEvent) => {
    handleComboboxKeyboard({
      event, isOpen, totalItems, highlightedIndex, displayedTemplates,
      setIsOpen, setHighlightedIndex, close, selectItem,
    })
  }

  const handleFocus = () => { setIsOpen(true) }

  return {
    isOpen, setIsOpen, highlightedIndex, setHighlightedIndex,
    selectItem, handleInputKeyDown, handleFocus,
  }
}
