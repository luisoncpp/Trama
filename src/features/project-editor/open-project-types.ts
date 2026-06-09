import type { IncrementalUpdate } from '../../shared/ipc.js'

export interface OpenProjectOptions {
  preferredFilePath?: string
  preferredPane?: 'primary' | 'secondary'
  incrementalUpdate?: IncrementalUpdate
}
