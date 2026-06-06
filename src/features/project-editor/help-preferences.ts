export const GETTING_STARTED_DISMISSED_STORAGE_KEY = 'trama.help.getting-started.dismissed.v1'

export function readGettingStartedDismissed(raw: string | null): boolean {
  return raw === 'true'
}

export function isGettingStartedDismissed(): boolean {
  if (typeof window === 'undefined' || !window.localStorage) {
    return false
  }
  return readGettingStartedDismissed(window.localStorage.getItem(GETTING_STARTED_DISMISSED_STORAGE_KEY))
}
