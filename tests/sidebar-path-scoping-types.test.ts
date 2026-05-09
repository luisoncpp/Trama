import { describe, expect, it } from 'vitest'
import {
  buildProjectCandidatePath,
  defineSidebarSectionRoot,
  toProjectPath,
  toSectionRelativePath,
  type ProjectRelativePath,
  type SectionRelativePath,
} from '../src/features/project-editor/components/sidebar/sidebar-path-scoping'

const sectionRoot = defineSidebarSectionRoot('book/')
const sectionPath = toSectionRelativePath('chapter-1/intro.md')
const projectPath = toProjectPath(sectionPath, sectionRoot)

function acceptProjectPath(path: ProjectRelativePath): ProjectRelativePath {
  return path
}

function acceptSectionPath(path: SectionRelativePath): SectionRelativePath {
  return path
}

acceptProjectPath(projectPath)
acceptSectionPath(sectionPath)
// @ts-expect-error project-relative and section-relative paths must not be mixed
acceptSectionPath(projectPath)
// @ts-expect-error project-relative and section-relative paths must not be mixed
acceptProjectPath(sectionPath)

describe('sidebar path scoping brands', () => {
  it('builds project-relative create paths through the scoping module', () => {
    expect(buildProjectCandidatePath(sectionRoot, 'chapter-1', 'intro', 0, true)).toBe('book/chapter-1/intro.md')
    expect(buildProjectCandidatePath(sectionRoot, '', 'Act-01', 1, false)).toBe('book/Act-01-2')
  })
})
