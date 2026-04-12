# AI Import Format Guide

## What Is AI Import?

AI import lets you create multiple Markdown files in your Trama project from a single language model (LLM) output. You only need to paste the generated content in the correct format.

## Required Format

Each file must be delimited by a special header:

```
=== FILE: path/to/file.md ===
file content goes here
```

### Important Rules

1. **File header**: It must start with `=== FILE:` followed by the relative path inside the project
2. **Paths**: Use paths relative to the project root (example: `book/Act-01/Chapter-01/Scene-001.md`)
3. **Delimiter**: Three equals signs (`===`) before and after `FILE:`
4. **Content**: All text after the newline following the header becomes the file content
5. **Multiple files**: You can include as many files as you want, each with its own header

## Frontmatter Support

Files can include YAML frontmatter at the beginning:

```markdown
=== FILE: lore/characters/protagonist.md ===
---
name: Elena Vance
type: character
tags: [protagonist, magic]
---

# Elena Vance

A powerful sorceress with a dark secret...
```

## Complete Example

```
=== FILE: book/Act-01/Chapter-01/Scene-001.md ===
---
name: The Awakening
type: scene
order: 1
---

# The Awakening

Elena opened her eyes. The tower shimmered in the distance.

"It is time," she whispered.

=== FILE: lore/places/crystal-tower.md ===
---
name: Crystal Tower
type: location
tags: [magic, north]
---

# Crystal Tower

An ancient structure built with magical crystals that absorb starlight.

### Properties
- Absorbs stellar energy
- Protects against dark magic
- Accessible only during the full moon

=== FILE: outline/Act-01/chapter-beats.md ===
# Act-01 Chapter Beats

Summary of key beats for the first chapter:

1. **Opening**: Elena wakes and detects an anomaly in the tower
2. **Inciting Incident**: A messenger warns of danger in the northern region
3. **Decision**: Elena agrees to investigate despite the personal cost
```

## Behavior with Existing Files

- ✅ **New files**: They will be created automatically
- ⚠️ **Existing files**: They will be skipped to avoid accidental overwrites

If you need to modify an existing file, rename it or delete it first.

## Usage Tips

1. **From LLMs**: Ask the model to generate output in this exact format
2. **Folder structure**: Intermediate folders are created automatically if they do not exist
3. **Preview**: Always review the preview before importing to confirm which files will be created
4. **Valid paths**: Avoid special characters in file names (`<>:"|?*`)

## Example Prompt for an LLM

```
Generate the following files for my fantasy project in Trama format:

For each file, use exactly this format:
=== FILE: full/path.md ===
[file content with YAML frontmatter if needed]

Files to generate:
1. `lore/characters/kael.md` for a protagonist named "Kael" with tags [hero, sword]
2. `lore/places/forest-of-shadows.md` for a location named "Forest of Shadows" with tags [danger, magic]
3. `book/Act-01/Chapter-01/Scene-001.md` for an opening scene set in the forest
4. `outline/arc-general.md` with a summary of the main story arc
```
