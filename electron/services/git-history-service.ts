import path from 'node:path'
import { readFile } from 'node:fs/promises'
import { brokenImagePlaceholderToComment } from '../../src/shared/markdown-image-placeholder.js'
import { collectLinkedImagePaths } from './document-image-persistence.js'
import type {
  GitDocumentRevision,
  GitHistoryStatusResponse,
  ListDocumentRevisionsResponse,
  LoadDocumentRevisionResponse,
  ReadDocumentRevisionResponse,
  SaveGitSnapshotResponse,
} from '../../src/shared/ipc.js'
import { IndexService } from './index-service.js'
import {
  assertNoBlockingGitState,
  discoverGitRepository,
  getManagedPathspecs,
  initializeGitRepository,
  isManagedRepositoryPath,
  isTrackedPath,
  pathExists,
  runGit,
  toProjectRelativePath,
  toRepoRelativePath,
} from './git-history-repository.js'
import { restoreHistoricalImages, syncRestoredDocumentCache, writeHistoricalDocument } from './git-history-restore-service.js'

const PAGE_SIZE = 100
const IMAGE_REGEX = /!\[([^\]]*)\]\(([^)\s]+)\)/gi

function formatSnapshotMessage(date = new Date()): string {
  const pad = (value: number) => String(value).padStart(2, '0')
  return `Trama snapshot: ${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function readNullSeparatedPaths(output: string | Buffer): string[] {
  return String(output).split('\0').map((value) => value.trim()).filter(Boolean)
}

async function hydrateHistoricalImages(projectRoot: string, markdown: string, readImage: (relativePath: string) => Promise<Buffer | null>): Promise<string> {
  let cursor = 0
  let output = ''
  let match: RegExpExecArray | null
  IMAGE_REGEX.lastIndex = 0
  while ((match = IMAGE_REGEX.exec(markdown)) !== null) {
    output += markdown.slice(cursor, match.index)
    const alt = match[1] ?? ''
    const imagePath = (match[2] ?? '').replace(/\\/g, '/')
    if (!imagePath.startsWith('res/') || !imagePath.toLowerCase().endsWith('.png')) {
      output += match[0]
    } else {
      const imageBytes = await readImage(imagePath)
      output += imageBytes ? `![${alt}](data:image/png;base64,${imageBytes.toString('base64')})` : brokenImagePlaceholderToComment(alt, imagePath)
    }
    cursor = match.index + match[0].length
  }
  return output + markdown.slice(cursor)
}

function parseRevisionLog(output: string, currentRepositoryPath: string, projectPrefix: string): GitDocumentRevision[] {
  const blocks = output.split('\u001e').map((value) => value.trim()).filter(Boolean)
  const revisions: GitDocumentRevision[] = []
  let trackedPath = currentRepositoryPath
  for (const block of blocks) {
    const [header, ...statusLines] = block.split(/\r?\n/)
    const [sha, committedAt, commitMessage] = header.split('\u001f')
    const pathAtRevision = toProjectRelativePath(projectPrefix, trackedPath)
    if (!sha || !committedAt || !commitMessage || pathAtRevision == null) {
      continue
    }
    revisions.push({ sha, committedAt, commitMessage, pathAtRevision })
    for (const line of statusLines) {
      if (!line.startsWith('R')) {
        continue
      }
      const [, oldPath, newPath] = line.split('\t')
      if (newPath === trackedPath && oldPath) {
        trackedPath = oldPath
      }
    }
  }
  return revisions
}

class GitHistoryService {
  async getStatus(projectRoot: string): Promise<GitHistoryStatusResponse> {
    const repository = await discoverGitRepository(projectRoot)
    return {
      gitAvailable: repository.gitAvailable,
      repositoryRoot: repository.repositoryRoot,
      usesParentRepository: repository.usesParentRepository,
      needsInitialization: repository.needsInitialization,
    }
  }

  async saveSnapshot(projectRoot: string, initializeRepository: boolean): Promise<SaveGitSnapshotResponse> {
    let repository = await discoverGitRepository(projectRoot)
    const createdRepository = !repository.repositoryRoot && initializeRepository
    if (!repository.gitAvailable) throw new Error('Git CLI is not available')
    if (!repository.repositoryRoot) {
      if (!initializeRepository) {
        return { kind: 'init-required', repositoryRoot: null, createdRepository: false, message: 'Initialize a Git repository at the project root before saving a snapshot.' }
      }
      repository = await initializeGitRepository(projectRoot)
    }
    await assertNoBlockingGitState(repository.repositoryRoot!)
    const managedPathspecs = getManagedPathspecs(repository.projectPrefix)
    const stagedPaths = readNullSeparatedPaths(await runGit(['-C', repository.repositoryRoot!, 'diff', '--cached', '--name-only', '-z', '--'], repository.repositoryRoot!))
    if (stagedPaths.some((filePath) => !isManagedRepositoryPath(repository.projectPrefix, filePath))) {
      throw new Error('Unrelated staged changes already exist. Commit or unstage them before saving a Trama snapshot.')
    }
    const changedPaths = new Set<string>([
      ...readNullSeparatedPaths(await runGit(['-C', repository.repositoryRoot!, 'diff', '--name-only', '-z', '--', ...managedPathspecs], repository.repositoryRoot!)),
      ...readNullSeparatedPaths(await runGit(['-C', repository.repositoryRoot!, 'diff', '--cached', '--name-only', '-z', '--', ...managedPathspecs], repository.repositoryRoot!)),
      ...readNullSeparatedPaths(await runGit(['-C', repository.repositoryRoot!, 'ls-files', '--others', '--exclude-standard', '-z', '--', ...managedPathspecs], repository.repositoryRoot!)),
    ])
    if (changedPaths.size === 0) {
      return { kind: 'noop', repositoryRoot: repository.repositoryRoot, createdRepository, message: 'No Trama-managed changes to snapshot.' }
    }
    await runGit(['-C', repository.repositoryRoot!, 'add', '-A', '--', ...Array.from(changedPaths)], repository.repositoryRoot!)
    const stagedManagedPaths = readNullSeparatedPaths(await runGit(['-C', repository.repositoryRoot!, 'diff', '--cached', '--name-only', '-z', '--', ...managedPathspecs], repository.repositoryRoot!))
    if (stagedManagedPaths.length === 0) {
      return { kind: 'noop', repositoryRoot: repository.repositoryRoot, createdRepository, message: 'No Trama-managed changes to snapshot.' }
    }
    const commitMessage = formatSnapshotMessage()
    await runGit(['-C', repository.repositoryRoot!, 'commit', '-m', commitMessage], repository.repositoryRoot!)
    const commitSha = String(await runGit(['-C', repository.repositoryRoot!, 'rev-parse', 'HEAD'], repository.repositoryRoot!)).trim()
    return { kind: 'saved', repositoryRoot: repository.repositoryRoot, createdRepository, commitSha, commitMessage, message: 'Snapshot saved.' }
  }

  async listDocumentRevisions(projectRoot: string, relativePath: string, cursor?: string | null): Promise<ListDocumentRevisionsResponse> {
    const repository = await discoverGitRepository(projectRoot)
    const current = { path: relativePath, hasRepository: Boolean(repository.repositoryRoot), isTracked: false }
    if (!repository.gitAvailable || !repository.repositoryRoot) {
      return { gitAvailable: repository.gitAvailable, repositoryRoot: repository.repositoryRoot, current, revisions: [], cursor: null, hasMore: false }
    }
    const repositoryPath = toRepoRelativePath(projectRoot, repository.repositoryRoot, relativePath)
    current.isTracked = await isTrackedPath(repository.repositoryRoot, repositoryPath)
    if (!current.isTracked) {
      return { gitAvailable: true, repositoryRoot: repository.repositoryRoot, current, revisions: [], cursor: null, hasMore: false }
    }
    const offset = Number.parseInt(cursor ?? '0', 10)
    const rawLog = String(await runGit([
      '-C', repository.repositoryRoot, 'log', '--follow', '--date-order', '--diff-filter=AMCR', `--skip=${Number.isFinite(offset) ? offset : 0}`,
      `-n`, String(PAGE_SIZE + 1), '--format=%x1e%H%x1f%cI%x1f%s', '--name-status', '--', repositoryPath,
    ], repository.repositoryRoot)).trim()
    if (!rawLog) {
      return { gitAvailable: true, repositoryRoot: repository.repositoryRoot, current, revisions: [], cursor: null, hasMore: false }
    }
    const parsed = parseRevisionLog(rawLog, repositoryPath, repository.projectPrefix)
    const hasMore = parsed.length > PAGE_SIZE
    const revisions = hasMore ? parsed.slice(0, PAGE_SIZE) : parsed
    return { gitAvailable: true, repositoryRoot: repository.repositoryRoot, current, revisions, cursor: hasMore ? String((Number.isFinite(offset) ? offset : 0) + revisions.length) : null, hasMore }
  }

  async readDocumentRevision(projectRoot: string, relativePath: string, commitSha: string, pathAtRevision: string): Promise<ReadDocumentRevisionResponse> {
    const repository = await discoverGitRepository(projectRoot)
    if (!repository.repositoryRoot) throw new Error('Project is not inside a Git repository')
    const repositoryPath = toRepoRelativePath(projectRoot, repository.repositoryRoot, pathAtRevision)
    const rawContent = await runGit(['-C', repository.repositoryRoot, 'show', `${commitSha}:${repositoryPath}`], repository.repositoryRoot, 'buffer') as Buffer
    const markdown = rawContent.toString('utf8')
    const content = await hydrateHistoricalImages(projectRoot, markdown, async (imagePath) => {
      const imageRepositoryPath = toRepoRelativePath(projectRoot, repository.repositoryRoot!, imagePath)
      try {
        return await runGit(['-C', repository.repositoryRoot!, 'show', `${commitSha}:${imageRepositoryPath}`], repository.repositoryRoot!, 'buffer') as Buffer
      } catch {
        const workingTreePath = path.resolve(projectRoot, imagePath)
        return (await pathExists(workingTreePath)) ? readFile(workingTreePath) : null
      }
    })
    return { path: relativePath, commitSha, content, linkedImagePaths: collectLinkedImagePaths(markdown) }
  }

  async loadDocumentRevision(projectRoot: string, relativePath: string, commitSha: string, pathAtRevision: string): Promise<LoadDocumentRevisionResponse> {
    const repository = await discoverGitRepository(projectRoot)
    if (!repository.repositoryRoot) throw new Error('Project is not inside a Git repository')
    await assertNoBlockingGitState(repository.repositoryRoot)
    const repositoryPath = toRepoRelativePath(projectRoot, repository.repositoryRoot, pathAtRevision)
    const rawContent = await runGit(['-C', repository.repositoryRoot, 'show', `${commitSha}:${repositoryPath}`], repository.repositoryRoot, 'buffer') as Buffer
    const markdown = rawContent.toString('utf8')
    const meta = await writeHistoricalDocument(projectRoot, relativePath, rawContent)
    const restoredImagePaths = await restoreHistoricalImages(projectRoot, markdown, async (imagePath) => {
      const imageRepositoryPath = toRepoRelativePath(projectRoot, repository.repositoryRoot!, imagePath)
      try {
        return await runGit(['-C', repository.repositoryRoot!, 'show', `${commitSha}:${imageRepositoryPath}`], repository.repositoryRoot!, 'buffer') as Buffer
      } catch {
        return null
      }
    })
    const indexService = new IndexService(projectRoot)
    await indexService.updateCache([relativePath], { [relativePath]: meta })
    await syncRestoredDocumentCache(projectRoot, relativePath, meta)
    return { path: relativePath, commitSha, restoredImagePaths }
  }
}

export const gitHistoryService = new GitHistoryService()
