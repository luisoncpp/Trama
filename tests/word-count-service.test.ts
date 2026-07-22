import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { countWordsInText, calculateSectionWordCounts } from '../electron/services/word-count-service'

describe('word-count-service', () => {
  describe('countWordsInText', () => {
    it('returns 0 for empty or whitespace-only text', () => {
      expect(countWordsInText('')).toBe(0)
      expect(countWordsInText('   \n\t  ')).toBe(0)
    })

    it('counts words in plain text', () => {
      expect(countWordsInText('Hello world from Trama')).toBe(4)
      expect(countWordsInText('One   two \n three')).toBe(3)
    })

    it('strips YAML frontmatter before counting words', () => {
      const markdown = `---
title: My Chapter
type: scene
tags:
  - fantasy
---
Once upon a time in a land far away.`
      expect(countWordsInText(markdown)).toBe(9)
    })
  })

  describe('calculateSectionWordCounts', () => {
    let tempDir: string

    beforeEach(async () => {
      tempDir = await mkdtemp(path.join(os.tmpdir(), 'trama-word-count-test-'))
      await mkdir(path.join(tempDir, 'book'), { recursive: true })
      await mkdir(path.join(tempDir, 'outline'), { recursive: true })
      await mkdir(path.join(tempDir, 'lore'), { recursive: true })
    })

    afterEach(async () => {
      await rm(tempDir, { recursive: true, force: true })
    })

    it('calculates word counts separately for book, outline, and lore', async () => {
      await writeFile(path.join(tempDir, 'book', 'chapter1.md'), '--- \ntitle: Chap 1\n---\nFirst chapter text here.', 'utf8') // 4 words
      await writeFile(path.join(tempDir, 'book', 'chapter2.md'), 'Second chapter content.', 'utf8') // 3 words
      await writeFile(path.join(tempDir, 'outline', 'act1.md'), 'Act one overview details.', 'utf8') // 4 words
      await writeFile(path.join(tempDir, 'lore', 'character.md'), 'Hero background history notes.', 'utf8') // 4 words

      const markdownFiles = [
        'book/chapter1.md',
        'book/chapter2.md',
        'outline/act1.md',
        'lore/character.md',
      ]

      const result = await calculateSectionWordCounts(tempDir, markdownFiles)

      expect(result.manuscript).toBe(7)
      expect(result.outline).toBe(4)
      expect(result.lore).toBe(4)
      expect(result.total).toBe(15)
    })

    it('handles empty project sections gracefully', async () => {
      const result = await calculateSectionWordCounts(tempDir, [])
      expect(result.manuscript).toBe(0)
      expect(result.outline).toBe(0)
      expect(result.lore).toBe(0)
      expect(result.total).toBe(0)
    })
  })
})
