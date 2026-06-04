/* eslint-disable max-lines */
import { z } from 'zod'
export { IPC_CHANNELS } from './ipc-channels.js'

export const pingRequestSchema = z.object({ message: z.string().trim().min(1).max(120) })
export const pingResponseSchema = z.object({ echo: z.string(), timestamp: z.string() })
export const debugLogRequestSchema = z.object({ source: z.string().trim().min(1).max(80), message: z.string().trim().min(1).max(300), details: z.unknown().optional() })
export const documentMetaSchema = z.object({ id: z.string().trim().min(1).optional(), type: z.enum(['character', 'location', 'scene', 'note', 'outline', 'map']).optional(), name: z.string().trim().min(1).optional(), tags: z.array(z.string()).optional() }).catchall(z.unknown())
export const treeItemSchema: z.ZodType<TreeItem> = z.lazy(() => z.object({ id: z.string(), title: z.string(), path: z.string(), type: z.enum(['file', 'folder']), children: z.array(treeItemSchema).optional() }))
export const projectIndexSchema = z.object({ version: z.string(), corkboardOrder: z.record(z.string(), z.array(z.string())), cache: z.record(z.string(), documentMetaSchema) })
export const projectSnapshotSchema = z.object({ rootPath: z.string(), tree: z.array(treeItemSchema), markdownFiles: z.array(z.string()), index: projectIndexSchema })
export const readDocumentRequestSchema = z.object({ path: z.string().trim().min(1) })
export const readDocumentResponseSchema = z.object({ path: z.string(), content: z.string(), meta: documentMetaSchema, linkedImagePaths: z.array(z.string()).optional() })
export const saveDocumentRequestSchema = z.object({ path: z.string().trim().min(1), content: z.string(), meta: documentMetaSchema.default({}) })
export const saveDocumentResponseSchema = z.object({ path: z.string(), version: z.string(), affectedImagePaths: z.array(z.string()).optional() })
export const createDocumentRequestSchema = z.object({ path: z.string().trim().min(1), initialContent: z.string().optional() })
export const createDocumentResponseSchema = z.object({ path: z.string(), createdAt: z.string() })
export const createMapDocumentRequestSchema = z.object({
  path: z.string().trim().min(1),
  name: z.string().trim().min(1),
  sourceImagePath: z.string().trim().min(1),
})
export const createMapDocumentResponseSchema = z.object({
  path: z.string(),
  createdAt: z.string(),
  imagePath: z.string(),
})
export const selectMapImageResponseSchema = z.object({
  filePath: z.string(),
})
export const createFolderRequestSchema = z.object({ path: z.string().trim().min(1) })
export const createFolderResponseSchema = z.object({ path: z.string(), createdAt: z.string() })
export const renameFolderRequestSchema = z.object({ path: z.string().trim().min(1), newName: z.string().trim().min(1) })
export const renameFolderResponseSchema = z.object({ path: z.string(), renamedTo: z.string(), updatedAt: z.string() })
export const deleteFolderRequestSchema = z.object({ path: z.string().trim().min(1) })
export const deleteFolderResponseSchema = z.object({ path: z.string(), deletedAt: z.string() })
export const renameDocumentRequestSchema = z.object({ path: z.string().trim().min(1), newName: z.string().trim().min(1) })
export const renameDocumentResponseSchema = z.object({ path: z.string(), renamedTo: z.string(), updatedAt: z.string() })
export const deleteDocumentRequestSchema = z.object({ path: z.string().trim().min(1), deleteAssociatedImages: z.boolean().optional() })
export const deleteDocumentResponseSchema = z.object({ path: z.string(), deletedAt: z.string(), deletedImagePaths: z.array(z.string()).optional() })
export const externalFileEventSchema = z.object({ path: z.string(), event: z.enum(['add', 'change', 'unlink']), source: z.enum(['internal', 'external']), timestamp: z.string() })
export const setFullscreenRequestSchema = z.object({ enabled: z.boolean() })
export const setFullscreenResponseSchema = z.object({ enabled: z.boolean() })
export const setWindowAppearanceRequestSchema = z.object({ theme: z.enum(['light', 'dark']) })
export const setWindowAppearanceResponseSchema = z.object({ theme: z.enum(['light', 'dark']) })
export const fullscreenChangedEventSchema = z.object({ enabled: z.boolean(), timestamp: z.string() })
export const spellcheckSettingsResponseSchema = z.object({
  enabled: z.boolean(),
  selectedLanguage: z.string().nullable(),
  availableLanguages: z.array(z.string()),
  supportsLanguageSelection: z.boolean(),
})
export const setSpellcheckSettingsRequestSchema = z.object({
  enabled: z.boolean(),
  language: z.string().trim().min(1).nullable().optional(),
})
export const aiImportModeSchema = z.enum(['append', 'replace'])
export const aiImportRequestSchema = z.object({
  clipboardContent: z.string().trim().min(1),
  projectRoot: z.string().trim().min(1),
  importMode: aiImportModeSchema.default('replace'),
})
export const aiImportFileSchema = z.object({ path: z.string(), content: z.string(), frontmatter: documentMetaSchema.optional(), exists: z.boolean() })
export const aiImportPreviewSchema = z.object({
  files: z.array(aiImportFileSchema),
  totalFiles: z.number().int().nonnegative(),
  newFiles: z.number().int().nonnegative(),
  existingFiles: z.number().int().nonnegative(),
})
export const aiImportResponseSchema = z.object({
  success: z.boolean(),
  created: z.array(z.string()),
  appended: z.array(z.string()),
  replaced: z.array(z.string()),
  skipped: z.array(z.string()),
  errors: z.array(z.object({ path: z.string(), error: z.string() })),
})
export const aiExportRequestSchema = z.object({ filePaths: z.array(z.string().trim().min(1)), projectRoot: z.string().trim().min(1), includeFrontmatter: z.boolean().default(true) })
export const aiExportResponseSchema = z.object({ success: z.boolean(), formattedContent: z.string(), fileCount: z.number().int().nonnegative() })
export const aiExportPickStagingModeSchema = z.enum(['files', 'folder'])
export const aiExportPickStagingRequestSchema = z.object({
  projectRoot: z.string().trim().min(1),
  mode: aiExportPickStagingModeSchema,
})
export const aiExportPickStagingResponseSchema = z.object({
  canceled: z.boolean(),
  absolutePaths: z.array(z.string()),
})
export const bookExportFormatSchema = z.enum(['markdown', 'html', 'docx', 'epub', 'pdf'])
export const bookExportRequestSchema = z.object({
  projectRoot: z.string().trim().min(1),
  format: bookExportFormatSchema,
  outputPath: z.string().trim().min(1),
  title: z.string().trim().min(1).optional(),
  author: z.string().trim().min(1).optional(),
})
export const bookExportResponseSchema = z.object({
  success: z.boolean(),
  outputPath: z.string(),
  format: bookExportFormatSchema,
  exportedFiles: z.number().int().nonnegative(),
})
export const reorderFilesRequestSchema = z.object({
  folderPath: z.string(),
  orderedIds: z.array(z.string()),
})
export const reorderFilesResponseSchema = z.object({
  folderPath: z.string(),
  orderedIds: z.array(z.string()),
})
export const moveFileRequestSchema = z.object({
  sourcePath: z.string().trim().min(1),
  targetFolder: z.string(),
})
export const moveFileResponseSchema = z.object({
  path: z.string(),
  renamedTo: z.string(),
  updatedAt: z.string(),
})
export const moveFolderRequestSchema = z.object({
  sourcePath: z.string().trim().min(1),
  targetParent: z.string(),
})
export const moveFolderResponseSchema = z.object({ sourcePath: z.string(), renamedTo: z.string(), updatedAt: z.string() })
export const readImageFileRequestSchema = z.object({ path: z.string().trim().min(1) })
export const readImageFileResponseSchema = z.object({ path: z.string(), dataUrl: z.string(), mimeType: z.string() })
export {
  gitHistoryStatusResponseSchema,
  saveGitSnapshotRequestSchema,
  saveGitSnapshotResponseSchema,
  listDocumentRevisionsRequestSchema,
  gitDocumentRevisionSchema,
  listDocumentRevisionsResponseSchema,
  readDocumentRevisionRequestSchema,
  readDocumentRevisionResponseSchema,
  loadDocumentRevisionRequestSchema,
  loadDocumentRevisionResponseSchema,
} from './ipc-git-history.js'
export {
  zuluTagModeSchema,
  zuluSelectFileResponseSchema,
  zuluImportPreviewRequestSchema,
  zuluImportPreviewFileSchema,
  zuluImportPreviewResponseSchema,
  zuluImportRequestSchema,
  zuluImportResponseSchema,
} from './ipc-zulu.js'
export const ipcErrorSchema = z.object({ code: z.string(), message: z.string(), details: z.unknown().optional() })

export type PingRequest = z.infer<typeof pingRequestSchema>
export type PingResponse = z.infer<typeof pingResponseSchema>
export type DebugLogRequest = z.infer<typeof debugLogRequestSchema>
export type DocumentMeta = z.infer<typeof documentMetaSchema>
export type TreeItem = { id: string; title: string; path: string; type: 'file' | 'folder'; children?: TreeItem[] }
export type ProjectIndex = z.infer<typeof projectIndexSchema>
export type ProjectSnapshot = z.infer<typeof projectSnapshotSchema>
export type ReadDocumentRequest = z.infer<typeof readDocumentRequestSchema>
export type ReadDocumentResponse = z.infer<typeof readDocumentResponseSchema>
export type SaveDocumentRequest = z.infer<typeof saveDocumentRequestSchema>
export type SaveDocumentResponse = z.infer<typeof saveDocumentResponseSchema>
export type CreateDocumentRequest = z.infer<typeof createDocumentRequestSchema>
export type CreateDocumentResponse = z.infer<typeof createDocumentResponseSchema>
export type CreateMapDocumentRequest = z.infer<typeof createMapDocumentRequestSchema>
export type CreateMapDocumentResponse = z.infer<typeof createMapDocumentResponseSchema>
export type SelectMapImageResponse = z.infer<typeof selectMapImageResponseSchema>
export type CreateFolderRequest = z.infer<typeof createFolderRequestSchema>
export type CreateFolderResponse = z.infer<typeof createFolderResponseSchema>
export type RenameFolderRequest = z.infer<typeof renameFolderRequestSchema>
export type RenameFolderResponse = z.infer<typeof renameFolderResponseSchema>
export type DeleteFolderRequest = z.infer<typeof deleteFolderRequestSchema>
export type DeleteFolderResponse = z.infer<typeof deleteFolderResponseSchema>
export type RenameDocumentRequest = z.infer<typeof renameDocumentRequestSchema>
export type RenameDocumentResponse = z.infer<typeof renameDocumentResponseSchema>
export type DeleteDocumentRequest = z.infer<typeof deleteDocumentRequestSchema>
export type DeleteDocumentResponse = z.infer<typeof deleteDocumentResponseSchema>
export type ExternalFileEvent = z.infer<typeof externalFileEventSchema>
export type SetFullscreenRequest = z.infer<typeof setFullscreenRequestSchema>
export type SetFullscreenResponse = z.infer<typeof setFullscreenResponseSchema>
export type SetWindowAppearanceRequest = z.infer<typeof setWindowAppearanceRequestSchema>
export type SetWindowAppearanceResponse = z.infer<typeof setWindowAppearanceResponseSchema>
export type FullscreenChangedEvent = z.infer<typeof fullscreenChangedEventSchema>
export type SpellcheckSettingsResponse = z.infer<typeof spellcheckSettingsResponseSchema>
export type SetSpellcheckSettingsRequest = z.infer<typeof setSpellcheckSettingsRequestSchema>
export type AiImportMode = z.infer<typeof aiImportModeSchema>
export type AiImportRequest = z.infer<typeof aiImportRequestSchema>
export type AiImportFile = z.infer<typeof aiImportFileSchema>
export type AiImportPreview = z.infer<typeof aiImportPreviewSchema>
export type AiImportResponse = z.infer<typeof aiImportResponseSchema>
export type AiExportRequest = z.infer<typeof aiExportRequestSchema>
export type AiExportResponse = z.infer<typeof aiExportResponseSchema>
export type AiExportPickStagingMode = z.infer<typeof aiExportPickStagingModeSchema>
export type AiExportPickStagingRequest = z.infer<typeof aiExportPickStagingRequestSchema>
export type AiExportPickStagingResponse = z.infer<typeof aiExportPickStagingResponseSchema>
export type BookExportFormat = z.infer<typeof bookExportFormatSchema>
export type BookExportRequest = z.infer<typeof bookExportRequestSchema>
export type BookExportResponse = z.infer<typeof bookExportResponseSchema>
export type ReorderFilesRequest = z.infer<typeof reorderFilesRequestSchema>
export type ReorderFilesResponse = z.infer<typeof reorderFilesResponseSchema>
export type MoveFileRequest = z.infer<typeof moveFileRequestSchema>
export type MoveFileResponse = z.infer<typeof moveFileResponseSchema>
export type MoveFolderRequest = z.infer<typeof moveFolderRequestSchema>
export type MoveFolderResponse = z.infer<typeof moveFolderResponseSchema>
export type ReadImageFileRequest = z.infer<typeof readImageFileRequestSchema>
export type ReadImageFileResponse = z.infer<typeof readImageFileResponseSchema>
export type NotifyCloseState = { hasUnsavedChanges: boolean }
export type {
  GitHistoryStatusResponse,
  SaveGitSnapshotRequest,
  SaveGitSnapshotResponse,
  ListDocumentRevisionsRequest,
  GitDocumentRevision,
  ListDocumentRevisionsResponse,
  ReadDocumentRevisionRequest,
  ReadDocumentRevisionResponse,
  LoadDocumentRevisionRequest,
  LoadDocumentRevisionResponse,
} from './ipc-git-history.js'
export type {
  IncrementalUpdate,
  OpenProjectRequest,
  SelectProjectFolderResponse,
  ValidateProjectFolderRequest,
  ValidateProjectFolderResponse,
  CloseProjectResponse,
  RevealProjectInFileManagerRequest,
  RevealProjectInFileManagerResponse,
} from './ipc-project.js'
export type {
  ZuluTagMode,
  ZuluSelectFileResponse,
  ZuluImportPreviewRequest,
  ZuluImportPreviewFile,
  ZuluImportPreviewResponse,
  ZuluImportRequest,
  ZuluImportResponse,
} from './ipc-zulu.js'
export type IpcError = z.infer<typeof ipcErrorSchema>
export type IpcEnvelope<T> = { ok: true; data: T } | { ok: false; error: IpcError }

