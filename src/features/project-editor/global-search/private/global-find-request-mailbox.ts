// @Architecture(descriptionShort="Single-slot mailbox handing a find preset from global search to the editor find bar")
import type { TextSearchOptions } from '../../../../shared/text-search/index.js'

export interface GlobalFindRequest {
  path: string
  query: string
  options: TextSearchOptions
}

let pendingRequest: GlobalFindRequest | null = null
const listeners = new Set<() => void>()

export function postGlobalFindRequest(request: GlobalFindRequest): void {
  pendingRequest = request
  for (const listener of [...listeners]) {
    listener()
  }
}

export function consumeGlobalFindRequest(documentPath: string | null): GlobalFindRequest | null {
  if (!pendingRequest || !documentPath || pendingRequest.path !== documentPath) {
    return null
  }

  const request = pendingRequest
  pendingRequest = null
  return request
}

export function subscribeGlobalFindRequests(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function clearGlobalFindRequest(): void {
  pendingRequest = null
}
