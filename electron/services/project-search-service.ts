// @Architecture(descriptionShort="Whole-project markdown content search over Trama-managed files")
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import type { SearchProjectFileMatch, SearchProjectRequest } from '../../src/shared/ipc.js'
import { countTextMatches } from '../../src/shared/text-search/index.js'
import { parseMarkdownWithFrontmatter } from './frontmatter.js'
import { scanProject } from './project-scanner.js'

export async function searchProjectMarkdown(
  projectRoot: string,
  request: SearchProjectRequest,
): Promise<SearchProjectFileMatch[]> {
  const { markdownFiles } = await scanProject(projectRoot)
  const results: SearchProjectFileMatch[] = []

  for (const relativePath of markdownFiles) {
    let markdown: string
    try {
      markdown = await readFile(path.resolve(projectRoot, relativePath), 'utf8')
    } catch {
      continue
    }

    const { content } = parseMarkdownWithFrontmatter(markdown)
    const matchCount = countTextMatches(content, request.query, {
      caseSensitive: request.caseSensitive,
      wholeWord: request.wholeWord,
    })

    if (matchCount > 0) {
      results.push({ path: relativePath, matchCount })
    }
  }

  return results
}
