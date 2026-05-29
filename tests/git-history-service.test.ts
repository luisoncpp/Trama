/** @vitest-environment node */

import os from 'node:os'
import path from 'node:path'
import { mkdir, mkdtemp, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { afterEach, describe, expect, it } from 'vitest'
import { gitHistoryService } from '../electron/services/git-history-service'
import { hasGitAvailable, runGit } from '../electron/services/git-history-repository'

const gitAvailable = await hasGitAvailable()

async function initRepo(root: string): Promise<void> {
  await runGit(['init'], root)
  await runGit(['config', 'user.name', 'Trama Tests'], root)
  await runGit(['config', 'user.email', 'tests@trama.local'], root)
}

async function commitAll(root: string, message: string): Promise<string> {
  await runGit(['add', '-A'], root)
  await runGit(['commit', '-m', message], root)
  return String(await runGit(['rev-parse', 'HEAD'], root)).trim()
}

describe.runIf(gitAvailable)('git history service', () => {
  let tempRoot: string | null = null

  afterEach(async () => {
    if (tempRoot) {
      await rm(tempRoot, { recursive: true, force: true })
      tempRoot = null
    }
  })

  it('aborts snapshot when unrelated staged changes already exist', async () => {
    tempRoot = await mkdtemp(path.join(os.tmpdir(), 'trama-git-history-'))
    const projectRoot = path.join(tempRoot, 'project')
    await mkdir(path.join(projectRoot, 'book'), { recursive: true })
    await writeFile(path.join(projectRoot, 'book', 'chapter.md'), '# One\n', 'utf8')
    await initRepo(tempRoot)
    await commitAll(tempRoot, 'initial')

    await writeFile(path.join(projectRoot, 'book', 'chapter.md'), '# Two\n', 'utf8')
    await writeFile(path.join(tempRoot, 'unrelated.txt'), 'keep me staged\n', 'utf8')
    await runGit(['add', 'unrelated.txt'], tempRoot)

    await expect(gitHistoryService.saveSnapshot(projectRoot, false)).rejects.toThrow('Unrelated staged changes already exist')
  })

  it('uses parent repository path scoping and commits only managed project content', async () => {
    tempRoot = await mkdtemp(path.join(os.tmpdir(), 'trama-git-history-'))
    const projectRoot = path.join(tempRoot, 'project')
    await mkdir(path.join(projectRoot, 'book'), { recursive: true })
    await writeFile(path.join(projectRoot, 'book', 'chapter.md'), '# One\n', 'utf8')
    await writeFile(path.join(projectRoot, '.trama.index.json'), '{"version":"1.0.0","corkboardOrder":{},"cache":{}}\n', 'utf8')
    await writeFile(path.join(tempRoot, 'unrelated.txt'), 'before\n', 'utf8')
    await initRepo(tempRoot)
    await commitAll(tempRoot, 'initial')

    await writeFile(path.join(projectRoot, 'book', 'chapter.md'), '# Two\n', 'utf8')
    await writeFile(path.join(tempRoot, 'unrelated.txt'), 'after\n', 'utf8')

    const result = await gitHistoryService.saveSnapshot(projectRoot, false)
    const committedFiles = String(await runGit(['show', '--name-only', '--format=', 'HEAD'], tempRoot)).split(/\r?\n/).filter(Boolean)

    expect(result.kind).toBe('saved')
    expect(path.resolve(result.repositoryRoot ?? '')).toBe(path.resolve(tempRoot))
    expect(committedFiles).toEqual(['project/book/chapter.md'])
  })

  it('returns no-op when only ignored managed files changed', async () => {
    tempRoot = await mkdtemp(path.join(os.tmpdir(), 'trama-git-history-'))
    await mkdir(path.join(tempRoot, 'res'), { recursive: true })
    await writeFile(path.join(tempRoot, '.gitignore'), 'res/ignored.png\n', 'utf8')
    await initRepo(tempRoot)
    await commitAll(tempRoot, 'initial')
    await writeFile(path.join(tempRoot, 'res', 'ignored.png'), 'ignored', 'utf8')

    const result = await gitHistoryService.saveSnapshot(tempRoot, false)

    expect(result.kind).toBe('noop')
    expect(result.message).toContain('No Trama-managed changes')
  })

  it('lists revisions newest-first and follows renames', async () => {
    tempRoot = await mkdtemp(path.join(os.tmpdir(), 'trama-git-history-'))
    await mkdir(path.join(tempRoot, 'book'), { recursive: true })
    await initRepo(tempRoot)
    await writeFile(path.join(tempRoot, 'book', 'old.md'), '# One\n', 'utf8')
    const firstSha = await commitAll(tempRoot, 'first')
    await rename(path.join(tempRoot, 'book', 'old.md'), path.join(tempRoot, 'book', 'new.md'))
    const renameSha = await commitAll(tempRoot, 'rename')
    await writeFile(path.join(tempRoot, 'book', 'new.md'), '# Two\n', 'utf8')
    const latestSha = await commitAll(tempRoot, 'second')

    const result = await gitHistoryService.listDocumentRevisions(tempRoot, 'book/new.md')

    expect(result.revisions.map((revision) => revision.sha)).toEqual([latestSha, renameSha, firstSha])
    expect(result.revisions.map((revision) => revision.pathAtRevision)).toEqual(['book/new.md', 'book/new.md', 'book/old.md'])
    expect(result.hasMore).toBe(false)
  })

  it('reads preview images from current tree when missing in commit and loads historical markdown plus images', async () => {
    tempRoot = await mkdtemp(path.join(os.tmpdir(), 'trama-git-history-'))
    await mkdir(path.join(tempRoot, 'book'), { recursive: true })
    await mkdir(path.join(tempRoot, 'res'), { recursive: true })
    await initRepo(tempRoot)
    const historicalMarkdown = ['---', 'name: Old Name', '---', '', '![Cover](res/cover.png)', ''].join('\n')
    await writeFile(path.join(tempRoot, 'book', 'doc.md'), historicalMarkdown, 'utf8')
    const firstSha = await commitAll(tempRoot, 'initial')

    await writeFile(path.join(tempRoot, 'res', 'cover.png'), Buffer.from('current-preview-image'))
    await writeFile(path.join(tempRoot, 'res', 'extra.png'), Buffer.from('keep-me'))
    await writeFile(path.join(tempRoot, '.trama.index.json'), JSON.stringify({
      version: '1.0.0',
      corkboardOrder: { book: ['book/doc.md'] },
      cache: { 'book/doc.md': { name: 'New Name' } },
    }, null, 2), 'utf8')
    await writeFile(path.join(tempRoot, 'book', 'doc.md'), ['---', 'name: New Name', '---', '', 'Changed', ''].join('\n'), 'utf8')

    const preview = await gitHistoryService.readDocumentRevision(tempRoot, 'book/doc.md', firstSha, 'book/doc.md')
    expect(preview.content).toContain('data:image/png;base64,')

    const loadResult = await gitHistoryService.loadDocumentRevision(tempRoot, 'book/doc.md', firstSha, 'book/doc.md')
    const restoredMarkdown = await readFile(path.join(tempRoot, 'book', 'doc.md'), 'utf8')
    const restoredImage = await readFile(path.join(tempRoot, 'res', 'cover.png'))
    const untouchedImage = await readFile(path.join(tempRoot, 'res', 'extra.png'))
    const savedIndex = JSON.parse(await readFile(path.join(tempRoot, '.trama.index.json'), 'utf8')) as { corkboardOrder: Record<string, string[]>; cache: Record<string, { name?: string }> }

    expect(loadResult.restoredImagePaths).toEqual([])
    expect(restoredMarkdown).toBe(historicalMarkdown)
    expect(restoredImage.equals(Buffer.from('current-preview-image'))).toBe(true)
    expect(untouchedImage.equals(Buffer.from('keep-me'))).toBe(true)
    expect(savedIndex.corkboardOrder.book).toEqual(['book/doc.md'])
    expect(savedIndex.cache['book/doc.md']?.name).toBe('Old Name')
  })
})
