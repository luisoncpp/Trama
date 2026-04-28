import { describe, expect, it, beforeEach } from 'vitest'
import {
  stripBase64ImagesFromHtml,
  stripBase64ImagesFromMarkdown,
  imagePlaceholderToComment,
  hydrateMarkdownImages,
  storeImageMap,
  getImageMap,
  clearImageMap,
  extractPlaceholdersFromHtml,
} from '../src/shared/markdown-image-placeholder'

describe('markdown-image-placeholder', () => {
  const TINY_PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwDwAFBQIAX8jx0gAAAABJRU5ErkJggg=='
  const TINY_JPEG = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAAA//EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8Af//Z'

  beforeEach(() => {
    clearImageMap('test-doc')
    clearImageMap('legacy-doc')
  })

  describe('stripBase64ImagesFromHtml', () => {
    it('extrae un solo dataUrl y devuelve html con placeholder', () => {
      const html = `<p>Hola</p><img src="${TINY_PNG}"><p>Adios</p>`
      const { htmlWithoutImages, imageMap } = stripBase64ImagesFromHtml(html)

      expect(htmlWithoutImages).not.toContain(TINY_PNG)
      expect(htmlWithoutImages).toContain('trama-image-placeholder:img_0')
      expect(imageMap.size).toBe(1)
      expect(imageMap.get('img_0')).toBe(TINY_PNG)
    })

    it('extrae multiples imagenes con uuids secuenciales', () => {
      const html = `<img src="${TINY_PNG}"><img src="${TINY_JPEG}">`
      const { htmlWithoutImages, imageMap } = stripBase64ImagesFromHtml(html)

      expect(imageMap.size).toBe(2)
      expect(imageMap.get('img_0')).toBe(TINY_PNG)
      expect(imageMap.get('img_1')).toBe(TINY_JPEG)
      expect(htmlWithoutImages).toContain('trama-image-placeholder:img_0')
      expect(htmlWithoutImages).toContain('trama-image-placeholder:img_1')
    })

    it('ignora img tags con src no-dataUrl', () => {
      const html = '<img src="https://example.com/image.png">'
      const { htmlWithoutImages, imageMap } = stripBase64ImagesFromHtml(html)

      expect(htmlWithoutImages).toBe(html)
      expect(imageMap.size).toBe(0)
    })

    it('ignora img tags sin src', () => {
      const html = '<img alt="test">'
      const { htmlWithoutImages, imageMap } = stripBase64ImagesFromHtml(html)

      expect(htmlWithoutImages).toBe(html)
      expect(imageMap.size).toBe(0)
    })

    it('preserva atributos adicionales del img tag', () => {
      const html = `<img class="responsive" src="${TINY_PNG}" alt="test">`
      const { htmlWithoutImages } = stripBase64ImagesFromHtml(html)

      expect(htmlWithoutImages).toContain('class="responsive"')
      expect(htmlWithoutImages).toContain('alt="test"')
      expect(htmlWithoutImages).toContain('trama-image-placeholder:img_0')
    })

    it('guarda el imageMap en cache cuando se provee documentId', () => {
      const html = `<img src="${TINY_PNG}">`
      stripBase64ImagesFromHtml(html, 'test-doc')

      const cached = getImageMap('test-doc')
      expect(cached).toBeDefined()
      expect(cached!.get('img_0')).toBe(TINY_PNG)
    })

    it('no guarda en cache cuando no hay imagenes', () => {
      stripBase64ImagesFromHtml('<p>sin imagenes</p>', 'test-doc')
      expect(getImageMap('test-doc')).toBeUndefined()
    })
  })

  describe('stripBase64ImagesFromMarkdown', () => {
    it('convierte markdown con imagen base64 en placeholder corto', () => {
      const markdown = `Antes\n\n![img_0](${TINY_PNG})\n\nDespues`

      const { markdownWithoutImages, imageMap } = stripBase64ImagesFromMarkdown(markdown)

      expect(markdownWithoutImages).toContain('<!-- IMAGE_PLACEHOLDER:img_0 -->')
      expect(markdownWithoutImages).not.toContain(TINY_PNG)
      expect(imageMap.get('img_0')).toBe(TINY_PNG)
    })

    it('guarda el imageMap cuando se provee documentId', () => {
      const markdown = `![img_0](${TINY_PNG})`

      stripBase64ImagesFromMarkdown(markdown, 'test-doc')

      expect(getImageMap('test-doc')?.get('img_0')).toBe(TINY_PNG)
    })

    it('genera uuid estable si el alt no sirve como placeholder', () => {
      const markdown = `![imagen uno](${TINY_PNG})\n![imagen dos](${TINY_JPEG})`

      const { markdownWithoutImages, imageMap } = stripBase64ImagesFromMarkdown(markdown)

      expect(markdownWithoutImages).toContain('<!-- IMAGE_PLACEHOLDER:img_0 -->')
      expect(markdownWithoutImages).toContain('<!-- IMAGE_PLACEHOLDER:img_1 -->')
      expect(imageMap.get('img_0')).toBe(TINY_PNG)
      expect(imageMap.get('img_1')).toBe(TINY_JPEG)
    })
  })

  describe('imagePlaceholderToComment', () => {
    it('genera un comentario HTML corto', () => {
      expect(imagePlaceholderToComment('img_0')).toBe('<!-- IMAGE_PLACEHOLDER:img_0 -->')
      expect(imagePlaceholderToComment('img_42')).toBe('<!-- IMAGE_PLACEHOLDER:img_42 -->')
    })
  })

  describe('extractPlaceholdersFromHtml', () => {
    it('extrae uuids de placeholder protocol', () => {
      const html = '<img src="trama-image-placeholder:img_0"><img src="trama-image-placeholder:img_1">'
      const result = extractPlaceholdersFromHtml(html)
      expect(result).toEqual(['img_0', 'img_1'])
    })

    it('devuelve array vacio cuando no hay placeholders', () => {
      expect(extractPlaceholdersFromHtml('<img src="https://example.com/a.png">')).toEqual([])
    })
  })

  describe('hydrateMarkdownImages', () => {
    it('expande placeholder corto a sintaxis markdown estandar', () => {
      storeImageMap('test-doc', new Map([['img_0', TINY_PNG]]))
      const markdown = 'Texto\n\n<!-- IMAGE_PLACEHOLDER:img_0 -->\n\nMas texto'

      const hydrated = hydrateMarkdownImages(markdown, 'test-doc')

      expect(hydrated).toContain('![img_0](')
      expect(hydrated).toContain(TINY_PNG)
      expect(hydrated).not.toContain('IMAGE_PLACEHOLDER')
    })

    it('expande multiples placeholders', () => {
      storeImageMap('test-doc', new Map([
        ['img_0', TINY_PNG],
        ['img_1', TINY_JPEG],
      ]))
      const markdown = '<!-- IMAGE_PLACEHOLDER:img_0 -->\n<!-- IMAGE_PLACEHOLDER:img_1 -->'

      const hydrated = hydrateMarkdownImages(markdown, 'test-doc')

      expect(hydrated).toContain('![img_0](')
      expect(hydrated).toContain('![img_1](')
      expect(hydrated).toContain(TINY_PNG)
      expect(hydrated).toContain(TINY_JPEG)
    })

    it('no modifica markdown sin placeholders', () => {
      const markdown = '# Titulo\n\nTexto normal'
      expect(hydrateMarkdownImages(markdown, 'test-doc')).toBe(markdown)
    })

    it('deja placeholder sin cambios si uuid no esta en cache', () => {
      const markdown = '<!-- IMAGE_PLACEHOLDER:img_99 -->'
      const hydrated = hydrateMarkdownImages(markdown, 'test-doc')
      expect(hydrated).toBe(markdown)
    })

    it('funciona con espacios en el comentario', () => {
      storeImageMap('test-doc', new Map([['img_0', TINY_PNG]]))
      const markdown = '<!--  IMAGE_PLACEHOLDER:img_0  -->'
      const hydrated = hydrateMarkdownImages(markdown, 'test-doc')
      expect(hydrated).toContain('![img_0](')
    })

    it('no modifica markdown cuando no hay cache para el documento', () => {
      const markdown = '<!-- IMAGE_PLACEHOLDER:img_0 -->'
      expect(hydrateMarkdownImages(markdown, 'nonexistent-doc')).toBe(markdown)
    })
  })

  describe('imageMapCache', () => {
    it('storeImageMap sobreescribe mapas anteriores', () => {
      storeImageMap('test-doc', new Map([['img_0', TINY_PNG]]))
      storeImageMap('test-doc', new Map([['img_0', TINY_JPEG]]))

      expect(getImageMap('test-doc')!.get('img_0')).toBe(TINY_JPEG)
    })

    it('clearImageMap elimina la entrada', () => {
      storeImageMap('test-doc', new Map([['img_0', TINY_PNG]]))
      clearImageMap('test-doc')
      expect(getImageMap('test-doc')).toBeUndefined()
    })
  })
})
