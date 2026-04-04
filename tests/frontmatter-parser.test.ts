import { describe, expect, it } from 'vitest'
import {
  parseMarkdownWithFrontmatter,
  serializeMarkdownWithFrontmatter,
} from '../electron/services/frontmatter'

describe('frontmatter parser', () => {
  it('extracts meta and markdown content', () => {
    const source = [
      '---',
      'id: scene-01',
      'name: Intro',
      'tags:',
      '  - act-1',
      '  - setup',
      'priority: 2',
      '---',
      '',
      '# Title',
      'Body',
    ].join('\n')

    const parsed = parseMarkdownWithFrontmatter(source)

    expect(parsed.hadFrontmatter).toBe(true)
    expect(parsed.meta.id).toBe('scene-01')
    expect(parsed.meta.name).toBe('Intro')
    expect(parsed.meta.tags).toEqual(['act-1', 'setup'])
    expect(parsed.meta.priority).toBe(2)
    expect(parsed.content).toContain('# Title')
  })

  it('serializes meta and content to markdown with frontmatter', () => {
    const output = serializeMarkdownWithFrontmatter(
      {
        id: 'char-1',
        name: 'Selene',
        tags: ['lore', 'character'],
      },
      'Character notes',
    )

    expect(output.startsWith('---\n')).toBe(true)
    expect(output).toContain('id: char-1')
    expect(output).toContain('name: Selene')
    expect(output).toContain('  - lore')
    expect(output).toContain('Character notes')
  })
})
