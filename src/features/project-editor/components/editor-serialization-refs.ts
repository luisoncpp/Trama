export interface EditorSerializationRefs {
  flush: () => void
  flushSync: () => string
  isSerializationPending: () => boolean
}