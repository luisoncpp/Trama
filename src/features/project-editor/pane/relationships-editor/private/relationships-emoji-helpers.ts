import { EMOJI_CATEGORIES, type EmojiCategory } from './relationships-emoji-data'
import { MAX_NODE_EMOJIS } from './relationships-config-serialization'

export function toggleNodeEmoji(emojis: readonly string[], emoji: string): string[] {
  const trimmed = emoji.trim()
  if (!trimmed) return [...emojis]
  if (emojis.includes(trimmed)) return emojis.filter((value) => value !== trimmed)
  if (emojis.length >= MAX_NODE_EMOJIS) return [...emojis]
  return [...emojis, trimmed]
}

function normalizeEmojiQuery(query: string): string {
  return query.trim().toLowerCase()
}

export function filterEmojiCategories(query: string): readonly EmojiCategory[] {
  const normalized = normalizeEmojiQuery(query)
  if (!normalized) return EMOJI_CATEGORIES
  return EMOJI_CATEGORIES.map((category) => ({
    name: category.name,
    emojis: category.emojis.filter((emoji) => {
      const lower = emoji.toLowerCase()
      return lower.includes(normalized) || category.name.toLowerCase().includes(normalized)
    }),
  })).filter((category) => category.emojis.length > 0)
}
