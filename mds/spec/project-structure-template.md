# Recommended Project Structure (Trama)

This template defines a base structure for a Trama project:

- Explorer Manuscript -> `book/`
- Outline -> `outline/`
- Lore -> `lore/`

## Folder Structure

```text
my-project/
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
    general-arc.md
    Act-01/
      chapter-beats.md
      scene-beats.md
    Act-02/
      chapter-beats.md

  lore/
    characters/
      protagonist.md
      antagonist.md
    places/
      main-city.md
      northern-region.md
    systems/
      magic.md
      politics.md
    timeline.md

  assets/
    references/
    images/

  templates/
    character.md
    scene.md
    outline-chapter.md

  .trama.index.json
```

## Suggested Rules

1. `book/` contains only final or in-progress narrative material (Act/Chapter/Scene).
2. `outline/` contains structure, beats, narrative plan, and working order.
3. `lore/` contains world knowledge (characters, places, systems, history).
4. `templates/` contains reusable markdown templates with frontmatter that serve as a starting point for new documents. The folder is created automatically when opening a valid project if it doesn't exist.
5. Use stable names without special characters to facilitate linking and moving.
6. Keep markdown (`.md`) as the primary format.

## Naming Conventions

- Acts: `Act-01`, `Act-02`, `Act-03`
- Chapters: `Chapter-01`, `Chapter-02`
- Scenes: `Scene-001.md`, `Scene-002.md`
- Outline documents: `chapter-beats.md`, `scene-beats.md`
- Lore documents: semantic name in lowercase with hyphens, e.g. `main-city.md`

## Minimum Initial File

```text
book/Act-01/Chapter-01/Scene-001.md
outline/general-arc.md
lore/characters/protagonist.md
```

## Operational Note

If a section cannot find its subfolder (`book/`, `outline/`, `lore/`), it is recommended to show an empty state with a CTA to create it automatically.
