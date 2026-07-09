// @Architecture(descriptionShort="Global search panel controller: query/options state, IPC search run, result opening")
import { useState } from 'preact/hooks'
import type { SearchProjectFileMatch } from '../../../../shared/ipc.js'
import type { TextSearchOptions } from '../../../../shared/text-search/index.js'
import { postGlobalFindRequest } from './global-find-request-mailbox.js'

export interface GlobalSearchController {
  query: string
  caseSensitive: boolean
  wholeWord: boolean
  searching: boolean
  errorMessage: string | null
  /** Query/options of the last completed search; null until a search has run. */
  executedQuery: string | null
  results: SearchProjectFileMatch[]
  setQuery: (value: string) => void
  toggleCaseSensitive: () => void
  toggleWholeWord: () => void
  runSearch: () => Promise<void>
  openResult: (path: string) => void
}

interface GlobalSearchSnapshot {
  query: string
  caseSensitive: boolean
  wholeWord: boolean
  executed: { query: string; options: TextSearchOptions } | null
  results: SearchProjectFileMatch[]
}

const EMPTY_SNAPSHOT: GlobalSearchSnapshot = {
  query: '',
  caseSensitive: false,
  wholeWord: false,
  executed: null,
  results: [],
}

// Survives panel remounts (e.g. switching sidebar sections) without a store dependency.
let lastSnapshot: GlobalSearchSnapshot = EMPTY_SNAPSHOT

export function resetGlobalSearchSnapshot(): void {
  lastSnapshot = EMPTY_SNAPSHOT
}

async function executeSearch(
  query: string,
  options: TextSearchOptions,
): Promise<{ files: SearchProjectFileMatch[]; errorMessage: string | null }> {
  try {
    const envelope = await window.tramaApi.searchProject({ query, ...options })
    if (envelope.ok) {
      return { files: envelope.data.files, errorMessage: null }
    }
    return { files: [], errorMessage: envelope.error.message }
  } catch (error) {
    return { files: [], errorMessage: error instanceof Error ? error.message : 'Unable to search project' }
  }
}

export function useGlobalSearchController({
  selectFile,
}: {
  selectFile: (filePath: string) => Promise<void>
}): GlobalSearchController {
  const [snapshot, setSnapshot] = useState<GlobalSearchSnapshot>(lastSnapshot)
  const [searching, setSearching] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const patchSnapshot = (partial: Partial<GlobalSearchSnapshot>) => {
    setSnapshot((previous) => {
      lastSnapshot = { ...previous, ...partial }
      return lastSnapshot
    })
  }

  const runSearch = async () => {
    const query = snapshot.query.trim()
    if (!query || searching || !window.tramaApi) {
      return
    }

    const options: TextSearchOptions = { caseSensitive: snapshot.caseSensitive, wholeWord: snapshot.wholeWord }
    setSearching(true)
    const { files, errorMessage: searchError } = await executeSearch(query, options)
    setErrorMessage(searchError)
    patchSnapshot({ results: files, executed: { query, options } })
    setSearching(false)
  }

  const openResult = (path: string) => {
    if (!snapshot.executed) {
      return
    }

    postGlobalFindRequest({ path, query: snapshot.executed.query, options: snapshot.executed.options })
    void selectFile(path)
  }

  return {
    query: snapshot.query,
    caseSensitive: snapshot.caseSensitive,
    wholeWord: snapshot.wholeWord,
    searching,
    errorMessage,
    executedQuery: snapshot.executed?.query ?? null,
    results: snapshot.results,
    setQuery: (value) => patchSnapshot({ query: value }),
    toggleCaseSensitive: () => patchSnapshot({ caseSensitive: !snapshot.caseSensitive }),
    toggleWholeWord: () => patchSnapshot({ wholeWord: !snapshot.wholeWord }),
    runSearch,
    openResult,
  }
}
