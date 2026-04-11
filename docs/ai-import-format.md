# Guía de Formato para Importación AI

## ¿Qué es la Importación AI?

La importación AI te permite crear múltiples archivos Markdown en tu proyecto Trama desde una única salida de un modelo de lenguaje (LLM). Solo necesitas pegar el contenido generado en el formato correcto.

> Estado actual (abril 2026): la importación AI ya está disponible en la app. La exportación AI todavía está en progreso a nivel de experiencia de usuario (UI/flujo de selección), aunque la base técnica de exportación ya existe en el backend.

## Formato Requerido

Cada archivo debe estar delimitado por una cabecera especial:

```
=== FILE: ruta/del/archivo.md ===
contenido del archivo aquí
```

### Reglas Importantes

1. **Cabecera de archivo**: Debe comenzar con `=== FILE:` seguido de la ruta relativa dentro del proyecto
2. **Rutas**: Usa rutas relativas desde la raíz del proyecto (ej: `book/Capitulo-01/Escena-001.md`)
3. **Separador**: Tres signos de igual (`===`) antes y después de `FILE:`
4. **Contenido**: Todo el texto después del salto de línea siguiente a la cabecera será el contenido del archivo
5. **Múltiples archivos**: Puedes incluir tantos archivos como quieras, cada uno con su propia cabecera

## Soporte para Frontmatter

Los archivos pueden incluir YAML frontmatter al inicio:

```markdown
=== FILE: lore/personajes/protagonista.md ===
---
nombre: Elena Vance
tipo: character
tags: [protagonista, magia]
---

# Elena Vance

Una poderosa hechicera con un secreto oscuro...
```

## Ejemplo Completo

```
=== FILE: book/Acto-01/Capitulo-01/Escena-001.md ===
---
nombre: El Despertar
tipo: scene
orden: 1
---

# El Despertar

Elena abrió los ojos. La torre brillaba en la distancia.

—Es hora —murmuró.

=== FILE: lore/locaciones/torre-cristalina.md ===
---
nombre: Torre Cristalina
tipo: location
tags: [magia, norte]
---

# Torre Cristalina

Una estructura ancestral construida con cristales mágicos que absorben la luz de las estrellas.

### Propiedades
- Absorbe energía estelar
- Protege contra magia oscura
- Solo accesible durante la luna llena

=== FILE: outline/arco-magia.md ===
# Arco de Magia

El sistema de magia se basa en tres principios fundamentales:

1. **Voluntad**: El poder interior del hechicero
2. **Conocimiento**: Las runas y encantamientos
3. **Sacrificio**: El precio de usar magia
```

## Comportamiento con Archivos Existentes

- ✅ **Archivos nuevos**: Se crearán automáticamente
- ⚠️ **Archivos existentes**: Se omitirán para evitar sobrescribir contenido accidentalmente

Si necesitas modificar un archivo existente, cámbiale el nombre o elimínalo primero.

## Consejos de Uso

1. **Desde LLMs**: Pide al modelo que genere la salida en este formato exacto
2. **Estructura de carpetas**: Las carpetas intermedias se crearán automáticamente si no existen
3. **Vista previa**: Siempre revisa la vista previa antes de importar para confirmar qué archivos se crearán
4. **Rutas válidas**: Evita caracteres especiales en nombres de archivo (`<>:"|?*`)

## Ejemplo de Prompt para LLM

```
Genera los siguientes archivos para mi proyecto de fantasía en formato Trama:

Para cada archivo, usa exactamente este formato:
=== FILE: ruta/completa.md ===
[contenido del archivo con frontmatter YAML si es necesario]

Archivos a generar:
1. Un personaje protagonista llamado "Kael" con tags [héroe, espada]
2. Una locación "Bosque de Sombras" con tags [peligro, magia]
3. Una escena inicial ambientada en el bosque
```
