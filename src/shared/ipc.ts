import { z } from 'zod'

export const IPC_CHANNELS = {
  ping: 'trama:ping',
} as const

export const pingRequestSchema = z.object({
  message: z.string().trim().min(1).max(120),
})

export const pingResponseSchema = z.object({
  echo: z.string(),
  timestamp: z.string(),
})

export const ipcErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  details: z.unknown().optional(),
})

export const ipcEnvelopeSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.discriminatedUnion('ok', [
    z.object({
      ok: z.literal(true),
      data: dataSchema,
    }),
    z.object({
      ok: z.literal(false),
      error: ipcErrorSchema,
    }),
  ])

export type PingRequest = z.infer<typeof pingRequestSchema>
export type PingResponse = z.infer<typeof pingResponseSchema>

export type IpcError = z.infer<typeof ipcErrorSchema>

export type IpcEnvelope<T> =
  | {
      ok: true
      data: T
    }
  | {
      ok: false
      error: IpcError
    }
