import { z } from 'zod'

const incrementalUpdateSchema = z.object({
  createdFiles: z.array(z.string()).optional(),
  deletedFiles: z.array(z.string()).optional(),
  renamedFiles: z.array(z.object({ from: z.string(), to: z.string() })).optional(),
  createdFolders: z.array(z.string()).optional(),
  deletedFolders: z.array(z.string()).optional(),
  renamedFolders: z.array(z.object({ from: z.string(), to: z.string() })).optional(),
}).optional()

export const openProjectRequestSchema = z.object({
  rootPath: z.string().trim().min(1),
  incrementalUpdate: incrementalUpdateSchema,
})
const selectProjectFolderResponseSchema = z.object({ rootPath: z.string().nullable() })
export const validateProjectFolderRequestSchema = z.object({ rootPath: z.string().trim().min(1) })
const validateProjectFolderResponseSchema = z.object({ valid: z.boolean() })
const closeProjectResponseSchema = z.object({ closed: z.literal(true) })
export const revealInFileManagerRequestSchema = z.object({ path: z.string().trim().min(1) })
const revealInFileManagerResponseSchema = z.object({ path: z.string() })

export type IncrementalUpdate = z.infer<typeof incrementalUpdateSchema>
export type OpenProjectRequest = z.infer<typeof openProjectRequestSchema>
export type SelectProjectFolderResponse = z.infer<typeof selectProjectFolderResponseSchema>
export type ValidateProjectFolderRequest = z.infer<typeof validateProjectFolderRequestSchema>
export type ValidateProjectFolderResponse = z.infer<typeof validateProjectFolderResponseSchema>
export type CloseProjectResponse = z.infer<typeof closeProjectResponseSchema>
export type RevealInFileManagerRequest = z.infer<typeof revealInFileManagerRequestSchema>
export type RevealInFileManagerResponse = z.infer<typeof revealInFileManagerResponseSchema>
