import { z } from 'zod'

export const IPC_CHANNELS = {
  ping: 'trama:ping',
  debugLog: 'trama:debug:log',
  openProject: 'trama:project:open',
  selectProjectFolder: 'trama:project:select-folder',
  readDocument: 'trama:document:read',
  saveDocument: 'trama:document:save',
  getIndex: 'trama:index:get',
  externalFileEvent: 'trama:project:external-file-event',
} as const

export const pingRequestSchema = z.object({
  message: z.string().trim().min(1).max(120),
})

export const pingResponseSchema = z.object({
  echo: z.string(),
  timestamp: z.string(),
})

export const debugLogRequestSchema = z.object({
  source: z.string().trim().min(1).max(80),
  message: z.string().trim().min(1).max(300),
  details: z.unknown().optional(),
})

export const documentMetaSchema = z
  .object({
    id: z.string().trim().min(1).optional(),
    type: z.enum(['character', 'location', 'scene', 'note', 'outline']).optional(),
    name: z.string().trim().min(1).optional(),
    tags: z.array(z.string()).optional(),
  })
  .catchall(z.unknown())

export const treeItemSchema: z.ZodType<TreeItem> = z.lazy(() =>
  z.object({
    id: z.string(),
    title: z.string(),
    path: z.string(),
    type: z.enum(['file', 'folder']),
    children: z.array(treeItemSchema).optional(),
  }),
)

export const projectIndexSchema = z.object({
  version: z.string(),
  corkboardOrder: z.record(z.string(), z.array(z.string())),
  cache: z.record(z.string(), documentMetaSchema),
})

export const projectSnapshotSchema = z.object({
  rootPath: z.string(),
  tree: z.array(treeItemSchema),
  markdownFiles: z.array(z.string()),
  index: projectIndexSchema,
})

export const openProjectRequestSchema = z.object({
  rootPath: z.string().trim().min(1),
})

export const selectProjectFolderResponseSchema = z.object({
  rootPath: z.string().nullable(),
})

export const readDocumentRequestSchema = z.object({
  path: z.string().trim().min(1),
})

export const readDocumentResponseSchema = z.object({
  path: z.string(),
  content: z.string(),
  meta: documentMetaSchema,
})

export const saveDocumentRequestSchema = z.object({
  path: z.string().trim().min(1),
  content: z.string(),
  meta: documentMetaSchema.default({}),
})

export const saveDocumentResponseSchema = z.object({
  path: z.string(),
  version: z.string(),
})

export const externalFileEventSchema = z.object({
  path: z.string(),
  event: z.enum(['add', 'change', 'unlink']),
  source: z.enum(['internal', 'external']),
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
export type DebugLogRequest = z.infer<typeof debugLogRequestSchema>
export type DocumentMeta = z.infer<typeof documentMetaSchema>
export type TreeItem = {
  id: string
  title: string
  path: string
  type: 'file' | 'folder'
  children?: TreeItem[]
}
export type ProjectIndex = z.infer<typeof projectIndexSchema>
export type ProjectSnapshot = z.infer<typeof projectSnapshotSchema>
export type OpenProjectRequest = z.infer<typeof openProjectRequestSchema>
export type SelectProjectFolderResponse = z.infer<typeof selectProjectFolderResponseSchema>
export type ReadDocumentRequest = z.infer<typeof readDocumentRequestSchema>
export type ReadDocumentResponse = z.infer<typeof readDocumentResponseSchema>
export type SaveDocumentRequest = z.infer<typeof saveDocumentRequestSchema>
export type SaveDocumentResponse = z.infer<typeof saveDocumentResponseSchema>
export type ExternalFileEvent = z.infer<typeof externalFileEventSchema>

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
