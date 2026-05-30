import { describe, expect, it } from 'vitest'
import { getMapConfig, resolveMarkerDestination, withMapConfig } from '../src/features/project-editor/pane/map-editor/map-editor-helpers'

describe('map-editor-helpers', () => {
  it('reads valid map config from meta', () => {
    const config = getMapConfig({
      type: 'map',
      mapConfig: {
        backgroundImage: 'res/world-map.jpg',
        markers: [{ x: 12, y: 42, label: 'Forest', destinationTag: '#wood-elves', color: '#2ecc71', description: 'Home' }],
      },
    })

    expect(config.backgroundImage).toBe('res/world-map.jpg')
    expect(config.markers).toHaveLength(1)
    expect(config.markers[0].label).toBe('Forest')
  })

  it('drops invalid markers while keeping valid ones', () => {
    const config = getMapConfig({
      type: 'map',
      mapConfig: {
        backgroundImage: 'res/world-map.jpg',
        markers: [{ x: 'bad', y: 2, label: 'Bad', destinationTag: '#bad', color: '#ffffff' }, { x: 1, y: 2, label: 'Good', destinationTag: '#good', color: '#ffffff' }],
      },
    })

    expect(config.markers).toHaveLength(1)
    expect(config.markers[0].label).toBe('Good')
  })

  it('writes normalized map config back into meta', () => {
    const meta = withMapConfig({}, {
      backgroundImage: 'res/map.png',
      markers: [{ x: 10, y: 20, label: 'City', destinationTag: '#city', color: '#ff0000' }],
    })

    expect(meta.type).toBe('map')
    expect(meta.mapConfig).toEqual({
      backgroundImage: 'res/map.png',
      markers: [{ x: 10, y: 20, label: 'City', destinationTag: '#city', color: '#ff0000' }],
    })
  })

  it('resolves marker destination tags with lowercase lookup', () => {
    expect(resolveMarkerDestination('WOOD-ELVES', { 'wood-elves': 'lore/forest.md' })).toBe('lore/forest.md')
    expect(resolveMarkerDestination('#missing', { 'wood-elves': 'lore/forest.md' })).toBeNull()
  })

  it('resolves spec-style #tag values against plain indexed tags', () => {
    expect(resolveMarkerDestination('#lirio', { lirio: 'lore/places/ciudad_principal.md' })).toBe('lore/places/ciudad_principal.md')
  })
})
