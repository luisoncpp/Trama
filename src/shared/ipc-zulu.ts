import { z } from 'zod'

export const zuluTagModeSchema = z.enum(['all', 'single', 'none'])
export const zuluSelectFileResponseSchema = z.object({ filePath: z.string(), content: z.string(), pageCount: z.number().int().nonnegative() })
export const zuluImportPreviewRequestSchema = z.object({ content: z.string().trim().min(1), targetFolder: z.string().trim().min(1).default('lore/') })
export const zuluImportPreviewFileSchema = z.object({ title: z.string(), path: z.string(), tagCount: z.number().int().nonnegative(), exists: z.boolean() })
export const zuluImportPreviewResponseSchema = z.object({ files: z.array(zuluImportPreviewFileSchema), totalFiles: z.number().int().nonnegative() })
export const zuluImportRequestSchema = z.object({ content: z.string().trim().min(1), targetFolder: z.string().trim().min(1).default('lore/'), tagMode: zuluTagModeSchema.default('none'), projectRoot: z.string().trim().min(1) })
export const zuluImportResponseSchema = z.object({ success: z.boolean(), created: z.array(z.string()), errors: z.array(z.object({ path: z.string(), error: z.string() })) })

export type ZuluTagMode = z.infer<typeof zuluTagModeSchema>
export type ZuluSelectFileResponse = z.infer<typeof zuluSelectFileResponseSchema>
export type ZuluImportPreviewRequest = z.infer<typeof zuluImportPreviewRequestSchema>
export type ZuluImportPreviewFile = z.infer<typeof zuluImportPreviewFileSchema>
export type ZuluImportPreviewResponse = z.infer<typeof zuluImportPreviewResponseSchema>
export type ZuluImportRequest = z.infer<typeof zuluImportRequestSchema>
export type ZuluImportResponse = z.infer<typeof zuluImportResponseSchema>
