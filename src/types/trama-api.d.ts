import type { IpcEnvelope, PingRequest, PingResponse } from '../shared/ipc'

declare global {
  interface Window {
    tramaApi: {
      ping(payload: PingRequest): Promise<IpcEnvelope<PingResponse>>
    }
  }
}

export {}
