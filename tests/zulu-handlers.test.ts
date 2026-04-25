/** @vitest-environment node */

import os from 'node:os'
import path from 'node:path'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { afterEach, describe, expect, it } from 'vitest'
import { handleZuluImportPreview, handleZuluImport } from '../electron/ipc/handlers/zulu-handlers'

const VALID_TWO_PAGE_ZULU = `<?xml version="1.0" ?>
<ZuluDoc>
    <date>1234567890</date>
    <index>
        <name>Index Page</name>
        <content><![CDATA[Welcome]]></content>
    </index>
    <content>
        <page>
            <name><![CDATA[Sistema de Magia]]></name>
            <content><![CDATA[Content here]]></content>
        </page>
        <page>
            <name><![CDATA[Historia Local]]></name>
            <content><![CDATA[More content]]></content>
        </page>
    </content>
</ZuluDoc>`

describe('zulu handlers', () => {
  let tempRoot: string | null = null

  afterEach(async () => {
    if (tempRoot) {
      await rm(tempRoot, { recursive: true, force: true })
      tempRoot = null
    }
  })

  describe('handleZuluImportPreview', () => {
    it('returns VALIDATION_ERROR for empty content', async () => {
      const response = await handleZuluImportPreview(
        {} as never,
        { content: '', targetFolder: 'lore/' },
      )

      expect(response.ok).toBe(false)
      if (response.ok) return
      expect(response.error.code).toBe('VALIDATION_ERROR')
    })

    it('returns VALIDATION_ERROR for empty targetFolder', async () => {
      const response = await handleZuluImportPreview(
        {} as never,
        { content: VALID_TWO_PAGE_ZULU, targetFolder: '' },
      )

      expect(response.ok).toBe(false)
      if (response.ok) return
      expect(response.error.code).toBe('VALIDATION_ERROR')
    })

    it('returns success envelope with file list', async () => {
      const response = await handleZuluImportPreview(
        {} as never,
        { content: VALID_TWO_PAGE_ZULU, targetFolder: 'lore/' },
      )

      expect(response.ok).toBe(true)
      if (!response.ok) return
      expect(response.data.totalFiles).toBe(3)
      expect(response.data.files).toHaveLength(3)
    })

    it('returns correct file paths in preview', async () => {
      const response = await handleZuluImportPreview(
        {} as never,
        { content: VALID_TWO_PAGE_ZULU, targetFolder: 'lore/' },
      )

      expect(response.ok).toBe(true)
      if (!response.ok) return
      expect(response.data.files.map((f) => f.path)).toEqual([
        'lore/index-page.md',
        'lore/sistema-de-magia.md',
        'lore/historia-local.md',
      ])
    })
  })

  describe('handleZuluImport', () => {
    it('returns VALIDATION_ERROR for empty content', async () => {
      tempRoot = await mkdtemp(path.join(os.tmpdir(), 'trama-zulu-handler-'))

      const response = await handleZuluImport(
        {} as never,
        { content: '', targetFolder: 'lore/', projectRoot: tempRoot, tagMode: 'none' },
      )

      expect(response.ok).toBe(false)
      if (response.ok) return
      expect(response.error.code).toBe('VALIDATION_ERROR')
    })

    it('returns VALIDATION_ERROR for missing projectRoot', async () => {
      const response = await handleZuluImport(
        {} as never,
        { content: VALID_TWO_PAGE_ZULU, targetFolder: 'lore/', tagMode: 'none' },
      )

      expect(response.ok).toBe(false)
      if (response.ok) return
      expect(response.error.code).toBe('VALIDATION_ERROR')
    })

    it('returns success envelope and creates files', async () => {
      tempRoot = await mkdtemp(path.join(os.tmpdir(), 'trama-zulu-handler-'))

      const response = await handleZuluImport(
        {} as never,
        { content: VALID_TWO_PAGE_ZULU, targetFolder: 'lore/', projectRoot: tempRoot, tagMode: 'none' },
      )

      expect(response.ok).toBe(true)
      if (!response.ok) return
      expect(response.data.success).toBe(true)
      expect(response.data.created).toHaveLength(3)
      expect(response.data.errors).toHaveLength(0)
    })

    it('creates actual files on disk', async () => {
      tempRoot = await mkdtemp(path.join(os.tmpdir(), 'trama-zulu-handler-'))

      await handleZuluImport(
        {} as never,
        { content: VALID_TWO_PAGE_ZULU, targetFolder: 'lore/', projectRoot: tempRoot, tagMode: 'none' },
      )

      const magiaPath = path.join(tempRoot, 'lore', 'sistema-de-magia.md')
      const exists = await import('node:fs/promises').then((fs) =>
        fs.access(magiaPath).then(() => true).catch(() => false),
      )
      expect(exists).toBe(true)
    })

    it('respects tagMode parameter', async () => {
      tempRoot = await mkdtemp(path.join(os.tmpdir(), 'trama-zulu-handler-'))

      const response = await handleZuluImport(
        {} as never,
        { content: VALID_TWO_PAGE_ZULU, targetFolder: 'lore/', projectRoot: tempRoot, tagMode: 'all' },
      )

      expect(response.ok).toBe(true)
      if (!response.ok) return
      expect(response.data.success).toBe(true)
    })

    it('handles invalid tagMode with validation error', async () => {
      tempRoot = await mkdtemp(path.join(os.tmpdir(), 'trama-zulu-handler-'))

      const response = await handleZuluImport(
        {} as never,
        { content: VALID_TWO_PAGE_ZULU, targetFolder: 'lore/', projectRoot: tempRoot, tagMode: 'invalid' as never },
      )

      expect(response.ok).toBe(false)
      if (response.ok) return
      expect(response.error.code).toBe('VALIDATION_ERROR')
    })

    it('handles empty content gracefully with validation error', async () => {
      tempRoot = await mkdtemp(path.join(os.tmpdir(), 'trama-zulu-handler-'))

      const response = await handleZuluImport(
        {} as never,
        { content: '   ', targetFolder: 'lore/', projectRoot: tempRoot, tagMode: 'none' },
      )

      expect(response.ok).toBe(false)
      if (response.ok) return
      expect(response.error.code).toBe('VALIDATION_ERROR')
    })
  })
})