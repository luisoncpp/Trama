// @Architecture(descriptionShort="Private implementation detail for parent module")
export function shouldRefreshTreeOnExternalEvent(eventKind: 'add' | 'change' | 'unlink'): boolean {
  return eventKind === 'add' || eventKind === 'unlink'
}
