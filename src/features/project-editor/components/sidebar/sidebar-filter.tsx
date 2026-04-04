import { useEffect, useState } from 'preact/hooks'

interface SidebarFilterProps {
  value: string
  debounceMs?: number
  onChange: (value: string) => void
}

export function SidebarFilter({ value, debounceMs = 180, onChange }: SidebarFilterProps) {
  const [draftValue, setDraftValue] = useState(value)

  useEffect(() => {
    setDraftValue(value)
  }, [value])

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      onChange(draftValue)
    }, debounceMs)

    return () => {
      window.clearTimeout(timeout)
    }
  }, [debounceMs, draftValue, onChange])

  return (
    <div class="sidebar-filter">
      <input
        type="search"
        class="sidebar-filter__input"
        placeholder="Filter files..."
        value={draftValue}
        onInput={(event) => setDraftValue((event.currentTarget as HTMLInputElement).value)}
        aria-label="Filter project files"
      />
      {draftValue && (
        <button type="button" class="sidebar-filter__clear" onClick={() => setDraftValue('')} aria-label="Clear filter">
          Clear
        </button>
      )}
    </div>
  )
}
