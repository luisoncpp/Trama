export const TAG_INDEX_REFRESH_EVENT = 'trama:tag-index-refresh'

export function notifyTagIndexRefresh(): void {
  window.dispatchEvent(new Event(TAG_INDEX_REFRESH_EVENT))
}
