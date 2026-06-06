import path from 'node:path'
import { access, stat } from 'node:fs/promises'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { TRAMA_INDEX_FILE_NAME, isManagedPath } from '../../src/shared/project-sections/index.js'

const execFileAsync = promisify(execFile)

export interface GitRepositoryContext {
  gitAvailable: boolean
  repositoryRoot: string | null
  usesParentRepository: boolean
  needsInitialization: boolean
  projectPrefix: string
}

function normalizeRepoPath(value: string): string {
  return value.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '')
}

export function toRepoRelativePath(projectRoot: string, repositoryRoot: string, projectRelativePath: string): string {
  const absoluteProjectRoot = path.resolve(projectRoot)
  const absoluteRepositoryRoot = path.resolve(repositoryRoot)
  const absoluteTarget = path.resolve(projectRoot, projectRelativePath)
  const projectRootWithSeparator = `${absoluteProjectRoot}${path.sep}`

  if (absoluteTarget !== absoluteProjectRoot && !absoluteTarget.startsWith(projectRootWithSeparator)) {
    throw new Error('Path escapes project root')
  }

  const repoRelativePath = path.relative(absoluteRepositoryRoot, absoluteTarget)
  const normalized = normalizeRepoPath(repoRelativePath)
  if (!normalized) {
    throw new Error('Path resolves outside repository root')
  }
  return normalized
}

export function toProjectRelativePath(projectPrefix: string, repositoryRelativePath: string): string | null {
  const normalizedPrefix = normalizeRepoPath(projectPrefix)
  const normalizedPath = normalizeRepoPath(repositoryRelativePath)
  if (!normalizedPrefix) {
    return normalizedPath
  }
  if (normalizedPath === normalizedPrefix) {
    return ''
  }
  const prefixWithSlash = `${normalizedPrefix}/`
  return normalizedPath.startsWith(prefixWithSlash) ? normalizedPath.slice(prefixWithSlash.length) : null
}

export function isManagedRepositoryPath(projectPrefix: string, repositoryRelativePath: string): boolean {
  const projectRelativePath = toProjectRelativePath(projectPrefix, repositoryRelativePath)
  return projectRelativePath != null && isManagedPath(projectRelativePath)
}

export function getManagedPathspecs(projectPrefix: string): string[] {
  const normalizedPrefix = normalizeRepoPath(projectPrefix)
  const managedRoots = ['book', 'outline', 'lore', 'res', TRAMA_INDEX_FILE_NAME]
  return managedRoots.map((segment) => (normalizedPrefix ? `${normalizedPrefix}/${segment}` : segment))
}

export async function runGit(args: string[], cwd: string, encoding: BufferEncoding | 'buffer' = 'utf8'): Promise<string | Buffer> {
  const result = await execFileAsync('git', args, {
    cwd,
    encoding,
    maxBuffer: 10 * 1024 * 1024,
    windowsHide: true,
  })
  return result.stdout as string | Buffer
}

export async function hasGitAvailable(): Promise<boolean> {
  try {
    await runGit(['--version'], process.cwd())
    return true
  } catch {
    return false
  }
}

export async function discoverGitRepository(projectRoot: string): Promise<GitRepositoryContext> {
  const gitAvailable = await hasGitAvailable()
  if (!gitAvailable) {
    return { gitAvailable, repositoryRoot: null, usesParentRepository: false, needsInitialization: false, projectPrefix: '' }
  }

  try {
    const repositoryRoot = String(await runGit(['-C', projectRoot, 'rev-parse', '--show-toplevel'], projectRoot)).trim()
    const projectPrefix = normalizeRepoPath(path.relative(repositoryRoot, projectRoot))
    return {
      gitAvailable,
      repositoryRoot,
      usesParentRepository: path.resolve(repositoryRoot) !== path.resolve(projectRoot),
      needsInitialization: false,
      projectPrefix,
    }
  } catch {
    return {
      gitAvailable,
      repositoryRoot: null,
      usesParentRepository: false,
      needsInitialization: true,
      projectPrefix: '',
    }
  }
}

export async function initializeGitRepository(projectRoot: string): Promise<GitRepositoryContext> {
  await runGit(['init'], projectRoot)
  return discoverGitRepository(projectRoot)
}

export async function assertNoBlockingGitState(repositoryRoot: string): Promise<void> {
  const absoluteGitDir = String(await runGit(['-C', repositoryRoot, 'rev-parse', '--absolute-git-dir'], repositoryRoot)).trim()
  const blockingStates = [
    { label: 'merge', target: path.join(absoluteGitDir, 'MERGE_HEAD') },
    { label: 'rebase', target: path.join(absoluteGitDir, 'rebase-apply') },
    { label: 'rebase', target: path.join(absoluteGitDir, 'rebase-merge') },
    { label: 'cherry-pick', target: path.join(absoluteGitDir, 'CHERRY_PICK_HEAD') },
    { label: 'bisect', target: path.join(absoluteGitDir, 'BISECT_LOG') },
    { label: 'bisect', target: path.join(absoluteGitDir, 'BISECT_START') },
  ]

  for (const state of blockingStates) {
    try {
      await access(state.target)
      throw new Error(`Git ${state.label} in progress. Finish it before using Project History.`)
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error
      }
    }
  }
}

export async function isTrackedPath(repositoryRoot: string, repositoryRelativePath: string): Promise<boolean> {
  try {
    await runGit(['-C', repositoryRoot, 'ls-files', '--error-unmatch', '--', repositoryRelativePath], repositoryRoot)
    return true
  } catch {
    return false
  }
}

export async function pathExists(absolutePath: string): Promise<boolean> {
  try {
    await stat(absolutePath)
    return true
  } catch {
    return false
  }
}
