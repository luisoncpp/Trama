import { describe, expect, it } from 'vitest'
import {
  buildEdgeGeometry,
  buildNodeId,
  estimateNodeHalfExtents,
  getEdgeDashArray,
  getParallelEdgeIndex,
  getRelationshipsConfig,
  withRelationshipsConfig,
} from '../src/features/project-editor/pane/relationships-editor/relationships-editor-helpers'
import type { RelationshipEdge } from '../src/features/project-editor/pane/relationships-editor/relationships-editor-types'

describe('relationships-editor-helpers', () => {
  it('reads valid relationships config from meta', () => {
    const config = getRelationshipsConfig({
      type: 'relationships',
      relationshipsConfig: {
        nodes: [
          { id: 'aldren', x: 100, y: 200, label: 'Aldren', destinationTag: 'aldren', color: '#e74c3c', description: 'The King.' },
          { id: 'cael', x: 300, y: 400, label: 'Cael', destinationTag: 'cael', color: '#3498db' },
        ],
        edges: [{ from: 'aldren', to: 'cael', label: 'sent on quest', color: '#3498db', style: 'solid', direction: 'forward' }],
        edgePresets: [{ name: 'Allies', color: '#2ecc71', style: 'solid', direction: 'both' }],
      },
    })

    expect(config.nodes).toHaveLength(2)
    expect(config.edges).toHaveLength(1)
    expect(config.edges[0].label).toBe('sent on quest')
    expect(config.edgePresets).toHaveLength(1)
    expect(config.edgePresets[0].name).toBe('Allies')
  })

  it('returns an empty config when meta has no relationshipsConfig', () => {
    expect(getRelationshipsConfig({})).toEqual({ nodes: [], edges: [], edgePresets: [] })
  })

  it('drops invalid nodes and edges that reference missing or identical nodes', () => {
    const config = getRelationshipsConfig({
      type: 'relationships',
      relationshipsConfig: {
        nodes: [
          { id: 'good', x: 1, y: 2, label: 'Good', destinationTag: 'good', color: '#ffffff' },
          { id: '', x: 1, y: 2, label: 'No id', destinationTag: '', color: '#ffffff' },
          { id: 'bad-pos', x: 'oops', y: 2, label: 'Bad', destinationTag: '', color: '#ffffff' },
        ],
        edges: [
          { from: 'good', to: 'missing', color: '#ffffff', style: 'solid', direction: 'forward' },
          { from: 'good', to: 'good', color: '#ffffff', style: 'solid', direction: 'forward' },
        ],
      },
    })

    expect(config.nodes).toHaveLength(1)
    expect(config.nodes[0].id).toBe('good')
    expect(config.edges).toHaveLength(0)
  })

  it('normalizes unknown edge styles, directions, and colors to defaults', () => {
    const config = getRelationshipsConfig({
      relationshipsConfig: {
        nodes: [
          { id: 'a', x: 0, y: 0, label: 'A', destinationTag: '' },
          { id: 'b', x: 10, y: 10, label: 'B', destinationTag: '' },
        ],
        edges: [{ from: 'a', to: 'b', color: 'not-a-color', style: 'wavy', direction: 'sideways' }],
      },
    })

    expect(config.nodes[0].color).toBe('#6ea6ff')
    expect(config.edges[0]).toMatchObject({ color: '#e74c3c', style: 'solid', direction: 'forward' })
  })

  it('writes normalized relationships config back into meta', () => {
    const meta = withRelationshipsConfig({}, {
      nodes: [{ id: 'a', x: 10, y: 20, label: 'A', destinationTag: 'a', color: '#ff0000' }],
      edges: [{ from: 'a', to: 'b', label: '', color: '#00ff00', style: 'dashed', direction: 'both' }],
      edgePresets: [{ name: 'Enemies', color: '#e74c3c', style: 'dashed', direction: 'both' }],
    })

    expect(meta.type).toBe('relationships')
    expect(meta.relationshipsConfig).toEqual({
      nodes: [{ id: 'a', x: 10, y: 20, label: 'A', destinationTag: 'a', color: '#ff0000' }],
      edges: [{ from: 'a', to: 'b', color: '#00ff00', style: 'dashed', direction: 'both' }],
      edgePresets: [{ name: 'Enemies', color: '#e74c3c', style: 'dashed', direction: 'both' }],
    })
  })

  it('round-trips config through meta serialization', () => {
    const original = {
      nodes: [
        { id: 'aldren', x: 1, y: 2, label: 'Aldren', destinationTag: 'aldren', color: '#aa0000', description: 'King' },
        { id: 'cael', x: 3, y: 4, label: 'Cael', destinationTag: 'cael', color: '#00aa00' },
      ],
      edges: [{ from: 'aldren', to: 'cael', label: 'mentor', color: '#0000aa', style: 'dotted' as const, direction: 'none' as const }],
      edgePresets: [{ name: 'Mentor', color: '#0000aa', style: 'dotted' as const, direction: 'none' as const }],
    }

    expect(getRelationshipsConfig(withRelationshipsConfig({}, original))).toEqual(original)
  })

  it('builds unique slug node ids', () => {
    expect(buildNodeId('Aldren the Bold', [])).toBe('aldren-the-bold')
    expect(buildNodeId('Aldren', ['aldren'])).toBe('aldren-2')
    expect(buildNodeId('Aldren', ['aldren', 'aldren-2'])).toBe('aldren-3')
    expect(buildNodeId('  ', [])).toBe('character')
  })

  it('maps edge styles to svg dash arrays', () => {
    expect(getEdgeDashArray('solid')).toBeUndefined()
    expect(getEdgeDashArray('dashed')).toBe('10 6')
    expect(getEdgeDashArray('dotted')).toBe('2 5')
  })

  it('assigns increasing parallel indexes to edges between the same pair in either direction', () => {
    const edges: RelationshipEdge[] = [
      { from: 'a', to: 'b', label: '', color: '#ffffff', style: 'solid', direction: 'forward' },
      { from: 'b', to: 'a', label: '', color: '#ffffff', style: 'solid', direction: 'forward' },
      { from: 'a', to: 'c', label: '', color: '#ffffff', style: 'solid', direction: 'forward' },
      { from: 'a', to: 'b', label: '', color: '#ffffff', style: 'solid', direction: 'forward' },
    ]

    expect(getParallelEdgeIndex(edges, 0)).toBe(0)
    expect(getParallelEdgeIndex(edges, 1)).toBe(1)
    expect(getParallelEdgeIndex(edges, 2)).toBe(0)
    expect(getParallelEdgeIndex(edges, 3)).toBe(2)
  })

  it('estimates wider node pills for longer labels', () => {
    expect(estimateNodeHalfExtents('A').halfWidth).toBeLessThan(estimateNodeHalfExtents('Morokha').halfWidth)
  })

  it('anchors horizontal edge endpoints on the pill border, not a fixed inset', () => {
    const from = { id: 'morokha', x: 200, y: 300, label: 'Morokha', destinationTag: '', color: '#ffffff' }
    const to = { id: 'areki', x: 500, y: 300, label: 'Areki', destinationTag: '', color: '#ffffff' }
    const geometry = buildEdgeGeometry(from, to, 0)
    const startX = Number(geometry.path.match(/^M ([\d.]+)/)?.[1])
    const endX = Number(geometry.path.match(/([\d.]+) ([\d.]+)$/)?.[1])

    expect(startX).toBeGreaterThan(240)
    expect(endX).toBeLessThan(460)
  })
})
