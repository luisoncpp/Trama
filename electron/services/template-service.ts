import path from 'node:path'
import { mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises'
import { RELEVANT_SECTION_NAMES, TEMPLATES_DIRECTORY_NAME } from '../../src/shared/project-sections/index.js'

function resolveInsideProject(projectRoot: string, relativePath: string): string {
  const absoluteProjectRoot = path.resolve(projectRoot)
  const absoluteTarget = path.resolve(projectRoot, relativePath)
  const rootWithSeparator = `${absoluteProjectRoot}${path.sep}`

  if (absoluteTarget !== absoluteProjectRoot && !absoluteTarget.startsWith(rootWithSeparator)) {
    throw new Error('Path escapes project root')
  }

  return absoluteTarget
}

function normalizeRelative(relativePath: string): string {
  return relativePath.replace(/\\/g, '/')
}

async function collectTemplatePaths(
  projectRoot: string,
  relativeDir: string,
): Promise<string[]> {
  const absoluteDir = resolveInsideProject(projectRoot, relativeDir)
  const entries = await readdir(absoluteDir, { withFileTypes: true })
  const paths: string[] = []

  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name, 'es'))) {
    const childRelative = normalizeRelative(path.posix.join(relativeDir, entry.name))
    if (entry.isDirectory()) {
      paths.push(...await collectTemplatePaths(projectRoot, childRelative))
      continue
    }
    if (entry.isFile() && entry.name.toLowerCase().endsWith('.md')) {
      paths.push(childRelative)
    }
  }

  return paths
}

export class TemplateService {
  async ensureTemplatesDirectory(projectRoot: string): Promise<void> {
    const templatesFullPath = resolveInsideProject(projectRoot, TEMPLATES_DIRECTORY_NAME)

    try {
      const info = await stat(templatesFullPath)
      if (info.isDirectory()) {
        return
      }
    } catch {
      // Folder doesn't exist — check if this is a valid project first
    }

    for (const folder of RELEVANT_SECTION_NAMES) {
      try {
        const folderInfo = await stat(resolveInsideProject(projectRoot, folder))
        if (!folderInfo.isDirectory()) {
          return
        }
      } catch {
        return
      }
    }

    await mkdir(templatesFullPath, { recursive: true })
  }

  async createFromTemplate(
    projectRoot: string,
    templatePath: string,
    destinationPath: string,
  ): Promise<{ path: string; createdAt: string }> {
    const normalizedTemplate = normalizeRelative(templatePath)
    const normalizedDest = normalizeRelative(destinationPath)

    if (!normalizedTemplate.startsWith(`${TEMPLATES_DIRECTORY_NAME}/`)) {
      throw new Error('Template path must be inside the templates/ directory')
    }

    if (!normalizedDest.endsWith('.md')) {
      throw new Error('Only markdown files are supported')
    }

    const templateFullPath = resolveInsideProject(projectRoot, normalizedTemplate)
    const destFullPath = resolveInsideProject(projectRoot, normalizedDest)

    let stats: Awaited<ReturnType<typeof stat>>
    try {
      stats = await stat(templateFullPath)
    } catch {
      throw new Error('Template file not found')
    }

    if (!stats.isFile()) {
      throw new Error('Template path is not a file')
    }

    try {
      await stat(destFullPath)
      throw new Error('Destination file already exists')
    } catch (err: unknown) {
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw err
      }
    }

    await mkdir(path.dirname(destFullPath), { recursive: true })

    const content = await readFile(templateFullPath, 'utf8')
    await writeFile(destFullPath, content, { encoding: 'utf8', flag: 'wx' })

    return {
      path: normalizedDest,
      createdAt: new Date().toISOString(),
    }
  }

  async listTemplates(projectRoot: string): Promise<string[]> {
    await this.ensureTemplatesDirectory(projectRoot)

    try {
      return await collectTemplatePaths(projectRoot, TEMPLATES_DIRECTORY_NAME)
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return []
      }
      throw error
    }
  }
}

export const templateService = new TemplateService()
