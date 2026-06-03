import { describe, expect, it } from 'vitest'
import {
  absoluteToProjectRelative,
  formatStagingSkipMessage,
  hardenAbsolutePaths,
  mergeIntoStagingBasket,
} from '../src/features/project-editor/components/ai-export-staging'

describe('ai-export-staging relative path hardening', () => {
  const projectRoot = 'C:/writing/my-novel'

  it('converts absolute paths under project root to forward-slash relatives', () => {
    expect(absoluteToProjectRelative('C:\\writing\\my-novel\\book\\one.md', projectRoot)).toBe('book/one.md')
  })

  it('rejects paths outside the project root', () => {
    const report = hardenAbsolutePaths(['C:/other/book/one.md'], projectRoot)
    expect(report.accepted).toEqual([])
    expect(report.skippedOutsideProject).toBe(1)
  })

  it('keeps only book, lore, and outline markdown paths', () => {
    const report = hardenAbsolutePaths(
      [
        `${projectRoot}/book/one.md`,
        `${projectRoot}/res/map.png`,
        `${projectRoot}/lore/world.md`,
        `${projectRoot}/.trama.index.json`,
        `${projectRoot}/outline/plot.md`,
      ],
      projectRoot,
    )

    expect(report.accepted.sort()).toEqual(['book/one.md', 'lore/world.md', 'outline/plot.md'].sort())
    expect(report.skippedIrrelevant).toBe(1)
    expect(report.skippedDotSegment).toBe(1)
  })

  it('merges unique paths and counts duplicates', () => {
    const merged = mergeIntoStagingBasket(['book/a.md'], ['book/b.md', 'book/a.md'])
    expect(merged.paths).toEqual(['book/a.md', 'book/b.md'])
    expect(merged.report.skippedDuplicates).toBe(1)
  })

  it('formats skip feedback for staging toasts', () => {
    const message = formatStagingSkipMessage({
      accepted: [],
      skippedOutsideProject: 1,
      skippedIrrelevant: 2,
      skippedDotSegment: 0,
      skippedDuplicates: 1,
    })
    expect(message).toBe('Skipped: 1 outside project, 2 not in book/lore/outline, 1 duplicate.')
  })
})
