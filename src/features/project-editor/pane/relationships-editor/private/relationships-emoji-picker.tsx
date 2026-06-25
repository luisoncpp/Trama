// @Architecture(descriptionShort="Private implementation detail for parent module")
import { createPortal } from 'preact/compat'
import { useEffect, useMemo, useState } from 'preact/hooks'
import type { EmojiCategory } from './relationships-emoji-data'
import { filterEmojiCategories } from './relationships-emoji-helpers'

interface RelationshipsEmojiPickerProps {
  anchorRect: DOMRect | null
  selectedEmojis: string[]
  onToggle: (emoji: string) => void
  onClose: () => void
}

const PICKER_WIDTH = 304
const PICKER_HEIGHT = 372
const VIEWPORT_PAD = 12

export function computePickerPosition(anchorRect: DOMRect | null): { left: number; top: number } {
  if (!anchorRect) {
    return {
      left: Math.max(VIEWPORT_PAD, (window.innerWidth - PICKER_WIDTH) / 2),
      top: Math.max(VIEWPORT_PAD, (window.innerHeight - PICKER_HEIGHT) / 2),
    }
  }
  const left = Math.max(VIEWPORT_PAD, Math.min(anchorRect.left, window.innerWidth - PICKER_WIDTH - VIEWPORT_PAD))
  const below = anchorRect.bottom + 6
  if (below + PICKER_HEIGHT <= window.innerHeight - VIEWPORT_PAD) return { left, top: below }
  const above = anchorRect.top - PICKER_HEIGHT - 6
  return { left, top: Math.max(VIEWPORT_PAD, above) }
}

function RelationshipsEmojiPickerSection({ category, selectedEmojis, onToggle }: { category: EmojiCategory; selectedEmojis: string[]; onToggle: (emoji: string) => void }) {
  return (
    <section class="relationships-emoji-picker__section">
      <p class="relationships-emoji-picker__section-name">{category.name}</p>
      <div class="relationships-emoji-picker__grid">
        {category.emojis.map((emoji) => {
          const selected = selectedEmojis.includes(emoji)
          return (
            <button
              key={emoji}
              type="button"
              class={`relationships-emoji-picker__emoji${selected ? ' is-selected' : ''}`}
              aria-pressed={selected}
              title={selected ? `${emoji} — on this character. Click to remove.` : `${emoji} — click to add`}
              onClick={() => onToggle(emoji)}
            >
              <span aria-hidden="true">{emoji}</span>
            </button>
          )
        })}
      </div>
    </section>
  )
}

export function RelationshipsEmojiPicker({ anchorRect, selectedEmojis, onToggle, onClose }: RelationshipsEmojiPickerProps) {
  const [query, setQuery] = useState('')
  const categories = useMemo(/* filterEmojiCategoriesByQuery */ () => filterEmojiCategories(query), [query] /*Inputs for filterEmojiCategoriesByQuery*/)
  const position = useMemo(/* computeEmojiPickerPosition */ () => computePickerPosition(anchorRect), [anchorRect] /*Inputs for computeEmojiPickerPosition*/)

  useEffect(/* closeEmojiPickerOnEscape */ () => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose] /*Inputs for closeEmojiPickerOnEscape*/)

  return createPortal(
    <div class="relationships-emoji-picker-layer" onClick={onClose}>
      <div
        class="relationships-emoji-picker"
        role="dialog"
        aria-label="Add emoji to character"
        style={{ left: `${position.left}px`, top: `${position.top}px` }}
        onClick={(event) => event.stopPropagation()}
      >
        <header class="relationships-emoji-picker__header">
          <p class="relationships-emoji-picker__title">Emojis</p>
          <button type="button" class="relationships-emoji-picker__close" aria-label="Close emoji picker" onClick={onClose}>×</button>
        </header>
        <label class="relationships-emoji-picker__search">
          <input type="search" value={query} placeholder="Search emojis" onInput={(event) => setQuery(event.currentTarget.value)} />
        </label>
        <div class="relationships-emoji-picker__body">
          {categories.length === 0 ? (
            <p class="relationships-emoji-picker__empty">No emojis match “{query}”.</p>
          ) : (
            categories.map((category) => (
              <RelationshipsEmojiPickerSection key={category.name} category={category} selectedEmojis={selectedEmojis} onToggle={onToggle} />
            ))
          )}
        </div>
      </div>
    </div>,
    document.body,
  )
}
