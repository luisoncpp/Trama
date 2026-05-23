import type { IncrementalUpdate } from '../../shared/ipc'

export interface OpenProjectOptions {
  preferredFilePath?: string
  preferredPane?: 'primary' | 'secondary'
  incrementalUpdate?: IncrementalUpdate
}
