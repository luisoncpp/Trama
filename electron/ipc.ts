import type { IpcMain } from 'electron'
import {
  IPC_CHANNELS,
  pingRequestSchema,
  type IpcEnvelope,
  type PingRequest,
  type PingResponse,
} from '../src/shared/ipc.js'

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

export function registerIpcHandlers(ipcMain: IpcMain): void {
  ipcMain.handle(IPC_CHANNELS.ping, (_event, payload: PingRequest) => {
    return buildPingResponse(payload)
  })
}
