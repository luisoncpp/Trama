// @Architecture(descriptionShort="Global-search find preset consumption and content-mutation match refresh")
import { useEffect } from 'preact/hooks'
import { consumeGlobalFindRequest, subscribeGlobalFindRequests } from '../../../../global-search/index.js'
import type { SearchState } from './editor-session-find-state'
import type { TextSearchOptions } from '../../../../../../shared/text-search/index.js'

export interface FindContentSession {
  subscribeContentMutated(callback: () => void): () => void
}

export function useGlobalFindPresetEffect({
  documentId,
  openFind,
  applySearch,
}: {
  documentId: string | null
  openFind: () => void
  applySearch: (query: string, options: TextSearchOptions) => void
}) {
  useEffect(/* consumeGlobalFindRequestForDocument */ () => {
    if (!documentId) return
    const tryConsume = () => {
      const request = consumeGlobalFindRequest(documentId)
      if (!request) return
      openFind()
      applySearch(request.query, request.options)
    }
    tryConsume()
    return subscribeGlobalFindRequests(tryConsume)
  }, [documentId] /*Inputs for consumeGlobalFindRequestForDocument*/)
}

export function useContentMutatedRefreshEffect({
  isOpen,
  contentSession,
  documentId,
  hasQuery,
  refreshMatches,
}: {
  isOpen: boolean
  contentSession: FindContentSession | null
  documentId: string | null
  hasQuery: () => boolean
  refreshMatches: () => void
}) {
  useEffect(/* refreshMatchesOnContentMutated */ () => {
    if (!isOpen || !contentSession) return
    if (hasQuery()) refreshMatches()
    return contentSession.subscribeContentMutated(() => refreshMatches())
  }, [isOpen, contentSession, documentId] /*Inputs for refreshMatchesOnContentMutated*/)
}

export function buildToggleFindOption({
  stateRef,
  applySearch,
  keepFindFocus,
}: {
  stateRef: { current: SearchState }
  applySearch: (query: string, options: TextSearchOptions) => void
  keepFindFocus: () => void
}) {
  return (key: keyof TextSearchOptions) => {
    const current = stateRef.current
    applySearch(current.query, { ...current.options, [key]: !current.options[key] })
    keepFindFocus()
  }
}
