import { pingRequestSchema, type IpcEnvelope, type PingResponse } from '../../../src/shared/ipc.js'

export function buildPingResponse(rawPayload: unknown): IpcEnvelope<PingResponse> {
  const payload = pingRequestSchema.safeParse(rawPayload)

  if (!payload.success) {
    return {
      ok: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid payload for trama:ping',
        details: payload.error.flatten(),
      },
    }
  }

  return {
    ok: true,
    data: {
      echo: payload.data.message,
      timestamp: new Date().toISOString(),
    },
  }
}
