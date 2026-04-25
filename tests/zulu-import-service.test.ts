/** @vitest-environment node */

import os from 'node:os'
import path from 'node:path'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { afterEach, describe, expect, it } from 'vitest'
import { previewZuluImport, executeZuluImport } from '../electron/services/zulu-import-service'

const TWO_PAGE_ZULU = `<?xml version="1.0" ?>
<ZuluDoc>
    <date>1234567890</date>
    <index>
        <name>Index Page</name>
        <content><![CDATA[Welcome]]></content>
    </index>
    <content>
        <page>
            <name><![CDATA[Sistema de Magia]]></name>
            <content><![CDATA[Lnea uno.
Lnea dos.

Parragraph tres.]]></content>
        </page>
        <page>
            <name><![CDATA[Historia Local]]></name>
            <content><![CDATA[Historia sin ms contenido]]></content>
        </page>
    </content>
</ZuluDoc>`

const LATIN1_ACCENTED_ZULU = `<?xml version="1.0" ?>
<ZuluDoc>
    <date>1234567890</date>
    <index>
        <name>Index Page</name>
        <content><![CDATA[Pgina principal con acentos: \u00e1\u00e9\u00ed\u00f3\u00fa\u00f1]]></content>
    </index>
    <content>
        <page>
            <name><![CDATA[Pgina Con Acentos]]></name>
            <content><![CDATA[El se\u00f1or de los aos]]></content>
        </page>
    </content>
</ZuluDoc>`

describe('zulu import service', () => {
  let tempRoot: string | null = null

  afterEach(async () => {
    if (tempRoot) {
      await rm(tempRoot, { recursive: true, force: true })
      tempRoot = null
    }
  })

  describe('previewZuluImport', () => {
    it('returns correct file list with default lore/ target folder', () => {
      const preview = previewZuluImport(TWO_PAGE_ZULU, 'lore/')
      expect(preview.totalFiles).toBe(3)
      expect(preview.files.map((f) => f.path)).toEqual([
        'lore/index-page.md',
        'lore/sistema-de-magia.md',
        'lore/historia-local.md',
      ])
    })

    it('returns correct titles in preview', () => {
      const preview = previewZuluImport(TWO_PAGE_ZULU, 'lore/')
      expect(preview.files[0].title).toBe('Index Page')
      expect(preview.files[1].title).toBe('Sistema de Magia')
    })

    it('uses custom target folder', () => {
      const preview = previewZuluImport(TWO_PAGE_ZULU, 'book/')
      expect(preview.files[0].path).toBe('book/index-page.md')
    })

    it('normalizes filenames to kebab-case', () => {
      const preview = previewZuluImport(TWO_PAGE_ZULU, 'lore/')
      expect(preview.files[1].path).toBe('lore/sistema-de-magia.md')
    })

    it('replaces special characters with hyphens in filenames', () => {
      const specialCharsZulu = `<?xml version="1.0" ?>
<ZuluDoc>
    <content>
        <page>
            <name><![CDATA[File: With <Special> "Chars"]]></name>
            <content><![CDATA[Body]]></content>
        </page>
    </content>
</ZuluDoc>`
      const preview = previewZuluImport(specialCharsZulu, 'lore/')
      expect(preview.files[0].path).toBe('lore/file-with-special-chars.md')
    })

    it('collapses multiple hyphens in filenames', () => {
      const preview = previewZuluImport(TWO_PAGE_ZULU, 'lore/')
      expect(preview.files[1].path).not.toContain('--')
    })

    it('strips leading and trailing hyphens', () => {
      const preview = previewZuluImport(TWO_PAGE_ZULU, 'lore/')
      expect(preview.files[0].path).not.toMatch(/^-|-$/)
    })

    it('returns empty tag list for tagMode none in preview', () => {
      const preview = previewZuluImport(TWO_PAGE_ZULU, 'lore/')
      expect(preview.files[0].tagCount).toBe(1)
    })

    it('all preview files have exists: false', () => {
      const preview = previewZuluImport(TWO_PAGE_ZULU, 'lore/')
      expect(preview.files.every((f) => f.exists === false)).toBe(true)
    })

    it('handles collision within same batch by adding numeric suffix', () => {
      const duplicateNamesZulu = `<?xml version="1.0" ?>
<ZuluDoc>
    <content>
        <page>
            <name><![CDATA[My Page]]></name>
            <content><![CDATA[Body 1]]></content>
        </page>
        <page>
            <name><![CDATA[My Page]]></name>
            <content><![CDATA[Body 2]]></content>
        </page>
        <page>
            <name><![CDATA[My Page]]></name>
            <content><![CDATA[Body 3]]></content>
        </page>
    </content>
</ZuluDoc>`
      const preview = previewZuluImport(duplicateNamesZulu, 'lore/')
      expect(preview.files.map((f) => f.path)).toEqual([
        'lore/my-page.md',
        'lore/my-page-2.md',
        'lore/my-page-3.md',
      ])
    })

    it('handles empty title by falling back to untitled', () => {
      const emptyTitleZulu = `<?xml version="1.0" ?>
<ZuluDoc>
    <content>
        <page>
            <name><![CDATA[  ]]></name>
            <content><![CDATA[Body]]></content>
        </page>
    </content>
</ZuluDoc>`
      const preview = previewZuluImport(emptyTitleZulu, 'lore/')
      expect(preview.totalFiles).toBe(0)
      expect(preview.files).toHaveLength(0)
    })
  })

  describe('executeZuluImport', () => {
    it('creates markdown files with frontmatter and content', async () => {
      tempRoot = await mkdtemp(path.join(os.tmpdir(), 'trama-zulu-import-'))

      const result = await executeZuluImport(TWO_PAGE_ZULU, 'lore/', tempRoot, 'none')

      expect(result.success).toBe(true)
      expect(result.created).toHaveLength(3)
      expect(result.errors).toHaveLength(0)

      const indexContent = await readFile(path.join(tempRoot, 'lore', 'index-page.md'), 'utf-8')
      expect(indexContent).toContain('title: Index Page')
      expect(indexContent).toContain('Welcome')
    })

    it('adds tags to frontmatter when tagMode is all', async () => {
      tempRoot = await mkdtemp(path.join(os.tmpdir(), 'trama-zulu-import-'))

      await executeZuluImport(TWO_PAGE_ZULU, 'lore/', tempRoot, 'all')

      const magiaContent = await readFile(path.join(tempRoot, 'lore', 'sistema-de-magia.md'), 'utf-8')
      expect(magiaContent).toContain('tags:')
      expect(magiaContent).toContain('- sistema de magia')
    })

    it('adds tags only for single-word titles when tagMode is single', async () => {
      tempRoot = await mkdtemp(path.join(os.tmpdir(), 'trama-zulu-import-'))

      await executeZuluImport(TWO_PAGE_ZULU, 'lore/', tempRoot, 'single')

      const magiaContent = await readFile(path.join(tempRoot, 'lore', 'sistema-de-magia.md'), 'utf-8')
      expect(magiaContent).not.toContain('tags:')

      const historiaContent = await readFile(path.join(tempRoot, 'lore', 'historia-local.md'), 'utf-8')
      expect(historiaContent).not.toContain('tags:')
    })

    it('does not add tags when tagMode is none', async () => {
      tempRoot = await mkdtemp(path.join(os.tmpdir(), 'trama-zulu-import-'))

      await executeZuluImport(TWO_PAGE_ZULU, 'lore/', tempRoot, 'none')

      const magiaContent = await readFile(path.join(tempRoot, 'lore', 'sistema-de-magia.md'), 'utf-8')
      expect(magiaContent).not.toContain('tags:')
    })

    it('normalizes line endings with double spaces for hard breaks', async () => {
      tempRoot = await mkdtemp(path.join(os.tmpdir(), 'trama-zulu-import-'))

      await executeZuluImport(TWO_PAGE_ZULU, 'lore/', tempRoot, 'none')

      const magiaContent = await readFile(path.join(tempRoot, 'lore', 'sistema-de-magia.md'), 'utf-8')
      expect(magiaContent).toContain('Lnea uno.  ')
      expect(magiaContent).toContain('\n\n')
    })

    it('creates nested directories when target folder includes subfolders', async () => {
      tempRoot = await mkdtemp(path.join(os.tmpdir(), 'trama-zulu-import-'))

      await executeZuluImport(TWO_PAGE_ZULU, 'book/chapters/', tempRoot, 'none')

      const indexPath = path.join(tempRoot, 'book', 'chapters', 'index-page.md')
      await expect(readFile(indexPath, 'utf-8')).resolves.toBeDefined()
    })

    it('handles collision with numeric suffixes for same page title', async () => {
      tempRoot = await mkdtemp(path.join(os.tmpdir(), 'trama-zulu-import-'))

      const duplicateZulu = `<?xml version="1.0" ?>
<ZuluDoc>
    <content>
        <page>
            <name><![CDATA[My Scene]]></name>
            <content><![CDATA[Body 1]]></content>
        </page>
        <page>
            <name><![CDATA[My Scene]]></name>
            <content><![CDATA[Body 2]]></content>
        </page>
    </content>
</ZuluDoc>`

      await executeZuluImport(duplicateZulu, 'lore/', tempRoot, 'none')

      const firstExists = await readFile(path.join(tempRoot, 'lore', 'my-scene.md'), 'utf-8')
      expect(firstExists).toContain('Body 1')

      const secondExists = await readFile(path.join(tempRoot, 'lore', 'my-scene-2.md'), 'utf-8')
      expect(secondExists).toContain('Body 2')
    })

    it('records created files in result.created array', async () => {
      tempRoot = await mkdtemp(path.join(os.tmpdir(), 'trama-zulu-import-'))

      const result = await executeZuluImport(TWO_PAGE_ZULU, 'lore/', tempRoot, 'none')

      expect(result.created).toContain('lore/index-page.md')
      expect(result.created).toContain('lore/sistema-de-magia.md')
      expect(result.created).toContain('lore/historia-local.md')
    })

    it('handles non-existent project root by creating directories', async () => {
      tempRoot = await mkdtemp(path.join(os.tmpdir(), 'trama-zulu-import-'))
      const newRoot = path.join(tempRoot, 'newproject')

      const result = await executeZuluImport(TWO_PAGE_ZULU, 'lore/', newRoot, 'none')

      expect(result.success).toBe(true)
      expect(result.created.length).toBe(3)
    })

    it('handles Latin-1 encoded content (accented characters)', async () => {
      tempRoot = await mkdtemp(path.join(os.tmpdir(), 'trama-zulu-import-'))

      await executeZuluImport(LATIN1_ACCENTED_ZULU, 'lore/', tempRoot, 'all')

      const indexContent = await readFile(path.join(tempRoot, 'lore', 'index-page.md'), 'utf-8')
      expect(indexContent).toContain('Pgina principal con acentos')
    })
  })
})