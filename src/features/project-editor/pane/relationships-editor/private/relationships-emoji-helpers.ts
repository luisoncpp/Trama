// @Architecture(descriptionShort="Pure helper functions for adjacent UI or domain logic")
import { EMOJI_CATEGORIES, EMOJI_SEARCH_ALIASES, type EmojiCategory } from './relationships-emoji-data'
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

function emojiMatchesQuery(emoji: string, categoryName: string, query: string): boolean {
  if (emoji.toLowerCase().includes(query)) return true
  if (categoryName.toLowerCase().includes(query)) return true
  const aliases = EMOJI_SEARCH_ALIASES[emoji]
  return aliases?.some((alias) => alias.includes(query)) ?? false
}

export function filterEmojiCategories(query: string): readonly EmojiCategory[] {
  const normalized = normalizeEmojiQuery(query)
  if (!normalized) return EMOJI_CATEGORIES
  return EMOJI_CATEGORIES.map((category) => ({
    name: category.name,
    emojis: category.emojis.filter((emoji) => emojiMatchesQuery(emoji, category.name, normalized)),
  })).filter((category) => category.emojis.length > 0)
}
