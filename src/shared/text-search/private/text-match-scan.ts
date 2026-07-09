// @Architecture(descriptionShort="Case/whole-word text match scanning shared by editor find and project search")

export interface TextSearchOptions {
  caseSensitive: boolean
  wholeWord: boolean
}

export const DEFAULT_TEXT_SEARCH_OPTIONS: TextSearchOptions = {
  caseSensitive: false,
  wholeWord: false,
}

const WORD_CHARACTER = /[\p{L}\p{N}_]/u

function isWordBoundary(text: string, index: number): boolean {
  if (index < 0 || index >= text.length) {
    return true
  }
  return !WORD_CHARACTER.test(text[index])
}

export function findTextMatches(text: string, query: string, options: TextSearchOptions): number[] {
  const normalizedQuery = options.caseSensitive ? query.trim() : query.trim().toLocaleLowerCase()
  if (!normalizedQuery) {
    return []
  }

  const normalizedText = options.caseSensitive ? text : text.toLocaleLowerCase()
  const matches: number[] = []
  let from = 0

  while (from < normalizedText.length) {
    const index = normalizedText.indexOf(normalizedQuery, from)
    if (index < 0) {
      break
    }

    const end = index + normalizedQuery.length
    if (options.wholeWord && !(isWordBoundary(normalizedText, index - 1) && isWordBoundary(normalizedText, end))) {
      from = index + 1
      continue
    }

    matches.push(index)
    from = end
  }

  return matches
}

export function countTextMatches(text: string, query: string, options: TextSearchOptions): number {
  return findTextMatches(text, query, options).length
}
