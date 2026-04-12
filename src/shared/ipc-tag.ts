import { z } from 'zod'

export const tagGetIndexResponseSchema = z.object({
  tags: z.record(z.string(), z.string()),
})

export const tagResolveRequestSchema = z.object({
  text: z.string(),
})

export const tagResolveResponseSchema = z.object({
  matches: z.array(z.object({
    tag: z.string(),
    start: z.number().int().nonnegative(),
    end: z.number().int().nonnegative(),
    filePath: z.string(),
  })),
})

export type TagGetIndexResponse = z.infer<typeof tagGetIndexResponseSchema>
export type TagResolveRequest = z.infer<typeof tagResolveRequestSchema>
export type TagResolveResponse = z.infer<typeof tagResolveResponseSchema>
