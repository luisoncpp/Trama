import type { IpcEnvelope } from '../src/shared/ipc.js'

export function errorEnvelope(code: string, message: string, details?: unknown): IpcEnvelope<never> {
  return {
    ok: false,
    error: {
      code,
      message,
      details,
    },
  }
}
