// @Architecture(descriptionShort="Shared `OpenProjectOptions` type used by the project editor Module, conflict flow, and")
import type { IncrementalUpdate } from '../../shared/ipc.js'

export interface OpenProjectOptions {
  preferredFilePath?: string
  preferredPane?: 'primary' | 'secondary'
  incrementalUpdate?: IncrementalUpdate
}
