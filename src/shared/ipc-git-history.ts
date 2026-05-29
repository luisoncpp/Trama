import { z } from 'zod'

export const gitHistoryStatusResponseSchema = z.object({
  gitAvailable: z.boolean(),
  repositoryRoot: z.string().nullable(),
  usesParentRepository: z.boolean(),
  needsInitialization: z.boolean(),
})

export const saveGitSnapshotRequestSchema = z.object({
  initializeRepository: z.boolean().default(false),
})

export const saveGitSnapshotResponseSchema = z.object({
  kind: z.enum(['saved', 'noop', 'init-required']),
  repositoryRoot: z.string().nullable(),
  createdRepository: z.boolean().default(false),
  commitSha: z.string().trim().min(1).optional(),
  commitMessage: z.string().trim().min(1).optional(),
  message: z.string().trim().min(1),
})

export const listDocumentRevisionsRequestSchema = z.object({
  path: z.string().trim().min(1),
  cursor: z.string().trim().min(1).nullable().optional(),
})

export const gitDocumentRevisionSchema = z.object({
  sha: z.string().trim().min(1),
  committedAt: z.string().trim().min(1),
  commitMessage: z.string().trim().min(1),
  pathAtRevision: z.string().trim().min(1),
})

export const listDocumentRevisionsResponseSchema = z.object({
  gitAvailable: z.boolean(),
  repositoryRoot: z.string().nullable(),
  current: z.object({
    path: z.string().trim().min(1),
    hasRepository: z.boolean(),
    isTracked: z.boolean(),
  }),
  revisions: z.array(gitDocumentRevisionSchema),
  cursor: z.string().nullable(),
  hasMore: z.boolean(),
})

export const readDocumentRevisionRequestSchema = z.object({
  path: z.string().trim().min(1),
  commitSha: z.string().trim().min(1),
  pathAtRevision: z.string().trim().min(1),
})

export const readDocumentRevisionResponseSchema = z.object({
  path: z.string().trim().min(1),
  commitSha: z.string().trim().min(1),
  content: z.string(),
  linkedImagePaths: z.array(z.string()).optional(),
})

export const loadDocumentRevisionRequestSchema = readDocumentRevisionRequestSchema

export const loadDocumentRevisionResponseSchema = z.object({
  path: z.string().trim().min(1),
  commitSha: z.string().trim().min(1),
  restoredImagePaths: z.array(z.string()),
})

export type GitHistoryStatusResponse = z.infer<typeof gitHistoryStatusResponseSchema>
export type SaveGitSnapshotRequest = z.infer<typeof saveGitSnapshotRequestSchema>
export type SaveGitSnapshotResponse = z.infer<typeof saveGitSnapshotResponseSchema>
export type ListDocumentRevisionsRequest = z.infer<typeof listDocumentRevisionsRequestSchema>
export type GitDocumentRevision = z.infer<typeof gitDocumentRevisionSchema>
export type ListDocumentRevisionsResponse = z.infer<typeof listDocumentRevisionsResponseSchema>
export type ReadDocumentRevisionRequest = z.infer<typeof readDocumentRevisionRequestSchema>
export type ReadDocumentRevisionResponse = z.infer<typeof readDocumentRevisionResponseSchema>
export type LoadDocumentRevisionRequest = z.infer<typeof loadDocumentRevisionRequestSchema>
export type LoadDocumentRevisionResponse = z.infer<typeof loadDocumentRevisionResponseSchema>
