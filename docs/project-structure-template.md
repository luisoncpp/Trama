# Estructura Recomendada de Proyecto (Trama)

Esta plantilla define una estructura base para un proyecto de Trama:

- Explorer Manuscript -> `book/`
- Outline -> `outline/`
- Lore -> `lore/`

## Estructura de carpetas

```text
mi-proyecto/
  book/
    Act-01/
      Chapter-01/
        Scene-001.md
        Scene-002.md
      Chapter-02/
        Scene-001.md
    Act-02/
      Chapter-01/
        Scene-001.md

  outline/
    arc-general.md
    Act-01/
      chapter-beats.md
      scene-beats.md
    Act-02/
      chapter-beats.md

  lore/
    characters/
      protagonista.md
      antagonista.md
    places/
      ciudad-principal.md
      region-norte.md
    systems/
      magia.md
      politica.md

  assets/
    references/
    images/

  .trama.index.json
```

## Reglas sugeridas

1. `book/` contiene solo material narrativo final o en redaccion (Act/Chapter/Scene).
2. `outline/` contiene estructura, beats, plan narrativo y orden de trabajo.
3. `lore/` contiene conocimiento del mundo (personajes, lugares, sistemas, historia).
4. Usa nombres estables y sin caracteres especiales para facilitar enlaces y movimientos.
5. Mantén archivos markdown (`.md`) como formato principal.

## Convenciones de nombres

- Actos: `Act-01`, `Act-02`, `Act-03`
- Capitulos: `Chapter-01`, `Chapter-02`
- Escenas: `Scene-001.md`, `Scene-002.md`
- Documentos de outline: `chapter-beats.md`, `scene-beats.md`
- Documentos de lore: nombre semantico en minusculas con guiones, por ejemplo `ciudad-principal.md`

## Archivo inicial minimo

```text
book/Act-01/Chapter-01/Scene-001.md
outline/arc-general.md
lore/personajes/protagonista.md
```

## Nota operativa

Si una seccion no encuentra su subcarpeta (`book/`, `outline/`, `lore/`), se recomienda mostrar estado vacio con CTA para crearla automaticamente.
