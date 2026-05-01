# Entender Trama (para humanos)

> Esto no es una guía de archivos. Es una explicación de **cómo funciona** la app. Para agentes de IA usa `START-HERE.md`.

---

## ¿Qué es Trama?

Una app de escritorio para escribir novelas/largos en markdown. Abre una carpeta del disco, te muestra los archivos en una barra lateral por secciones (`book/`, `outline/`, `lore/`), y editas con un editor visual rico (Quill). Todo se guarda en archivos `.md` normales en tu disco.

**Stack:** Electron (ventana, sistema de archivos) + Preact (interfaz) + TypeScript.

---

## Las 3 capas (y cómo se hablan)

Piensa en Trama como un restaurante:

```
         TÚ (usuario)
           │
    ┌──────▼──────┐   Renderer (Preact)
    │  Camarero   │   La interfaz que ves. Sidebar, editor, diálogos.
    │             │   Corre dentro de Chromium.
    └──────┬──────┘   NO puede tocar el disco directamente.
           │
      pedido │ IPC   "Tráeme el archivo X", "Guarda esto"
    (trama:*)│       Viaja por contextBridge (seguro, tipado con Zod).
           │
    ┌──────▼──────┐   Main Process (Node.js/Electron)
    │   Cocinero  │   Tiene acceso total al sistema.
    │             │   Lee/escribe archivos, vigila cambios (chokidar),
    └──────┬──────┘   maneja menús nativos, etc.
           │
    ┌──────▼──────┐   Disco
    │  Despensa   │   Tus archivos .md y .trama.index.json
    └─────────────┘
```

**Regla de oro:** El renderer NUNCA toca el disco. Todo pasa por IPC. Los canales están en `src/shared/ipc.ts` (único lugar donde se definen).

---

## 5 conceptos que explican el 80% del código

### 1. El estado de la app es "qué pane muestra qué archivo"

El corazón de Trama es `useProjectEditorState` (`src/features/project-editor/use-project-editor-state.ts`). Contiene:

- **`workspaceLayout`** — qué archivo está en cada pane (primario/secundario), cuál está activo, modo split sí/no, ratio del divisor.
- **`snapshot`** — todos los archivos del proyecto (árbol de carpetas + contenido en caché).
- **`paneStates`** — por cada pane: qué archivo tiene cargado, su contenido actual, si está sucio.

Cuando seleccionas un archivo en la sidebar → se actualiza `workspaceLayout` → el panel del editor escucha ese cambio → carga el contenido → renderiza en Quill.

### 2. La sidebar usa rutas relativas a la sección, IPC usa rutas absolutas

**Este es el bug más común.** Dentro de la sección `book/`, un archivo se llama `capitulo-1.md`. Pero en disco es `C:\proyecto\book\capitulo-1.md`. La conversión ocurre en `sidebar-panel-body.tsx`.

Funciones clave:
- `getScopedFiles(snapshot, section)` → quita el prefijo de sección
- `makeRootPath(sectionRelative, section)` → añade el prefijo de sección

Si algo falla al renombrar/mover/eliminar desde la sidebar, probablemente es esto.

### 3. El editor (Quill) es temperamental — tiene reglas estrictas

Quill es un editor rich text que internamente usa "Deltas" (operaciones de inserción/borrado). No es texto plano:

- `quill.getText()` **omite** los blots (imágenes, directivas de layout). Si usas ese índice para `getBounds()` falla.
- Los índices de Quill cuentan cada embed como longitud 1, aunque ocupe más visualmente.
- Nunca inyectes DOM dentro de `.ql-editor`. Los overlays van fuera.
- `quill.getBounds()` da coordenadas relativas a `quill.container`, NO a la ventana.
- Las imágenes en el editor viven en dos representaciones: placeholder corto (`<!-- IMAGE_PLACEHOLDER:... -->`) en estado, y base64 completo en Quill. Comparar ambos requiere normalización (`areEquivalentEditorValues`).

El ciclo de vida del editor: Quill se inicializa → recibe markdown → lo convierte a HTML → el usuario escribe → Quill emite evento → debounce → se serializa a markdown → se guarda en estado → autosave al disco.

### 4. El modo split tiene DOS capas de estado

Separadas a propósito para evitar carreras:

| Capa | Qué guarda | Síncrona |
|------|-----------|----------|
| Layout | Qué archivo en cada pane, cuál activo, ratio | ✅ Sí |
| Documento | Contenido cargado, isDirty | ❌ No (carga async) |

**Regla importante:** Cada acción que modifica el editor debe especificar explícitamente a qué pane va dirigida (`updateEditorValue(value, pane)`). Si omites el pane, usa el activo, y eso causa bugs de timing cuando el editor secundario dispara eventos mientras el primario sigue siendo el activo.

### 5. `.trama.index.json` es el "cache invisible"

Un JSON en la raíz del proyecto que guarda:
- **`corkboardOrder`** — orden personalizado de archivos por carpeta
- **`cache`** — frontmatter y metadatos cacheados

Se **reconstruye** (reconcilia) cada vez que se guarda/crea/renombra/elimina un archivo. La reconciliación añade archivos nuevos, quita los borrados, y mantiene el orden donde existe.

El watcher (chokidar) vigila cambios externos. Cuando detecta uno, clasifica si fue "interno" (lo hizo Trama) o "externo" (lo hizo otro programa). Los externos disparan una recarga del proyecto. En Windows, chokidar tiene un bug: hay que cerrar el watcher antes de re-escanear tras un cambio de carpeta.

---

## Estructura del proyecto en 30 segundos

```
trama/
├── electron/           ← Main process (Node.js)
│   ├── main.ts         ← Arranque de la app, crea la ventana
│   ├── preload.cts     ← Puente seguro renderer↔main (window.tramaApi)
│   ├── ipc.ts          ← Registro de canales IPC
│   ├── ipc/handlers/   ← Lógica de cada endpoint (documentos, carpetas, IA...)
│   └── services/       ← Capa de negocio (repositorio, índice, watcher, export...)
│
├── src/                ← Renderer (Preact)
│   ├── app.tsx         ← Componente raíz
│   ├── shared/         ← Código compartido main↔renderer (canales IPC, tipos)
│   ├── types/          ← Declaraciones de window.tramaApi
│   └── features/project-editor/
│       ├── project-editor-view.tsx    ← Layout principal (sidebar + paneles)
│       ├── use-project-editor-state.ts ← TODO el estado del editor
│       ├── use-project-editor-*.ts    ← Acciones (UI, archivos, layout, focus...)
│       └── components/
│           ├── workspace-editor-panels.tsx  ← Renderizado de los paneles
│           ├── rich-markdown-editor*.ts     ← Editor Quill (core, sync, find, focus...)
│           └── sidebar/                     ← Sidebar (árbol, filtro, menús, drag...)
│
└── docs/               ← Documentación (para agentes y humanos)
```

---

## Tareas comunes: dónde buscar y por qué

### Quiero añadir un botón o menú nuevo
1. ¿Es un comando global? → `electron/main-process/context-menu.ts` (menú nativo) + `src/shared/workspace-context-menu.ts` (evento) + `use-project-editor-context-menu-effect.ts` (receptor).
2. ¿Es en la sidebar? → `sidebar-file-context-menu.tsx` (click derecho en archivo) o `sidebar-folder-context-menu.tsx` (click derecho en carpeta).
3. ¿Es en el editor? → `rich-markdown-editor-toolbar.ts` (toolbar de Quill).

### Quiero añadir una operación de archivos nueva (ej. "duplicar archivo")
1. Define el canal en `src/shared/ipc.ts` (nombre + schemas Zod).
2. Crea el handler en `electron/ipc/handlers/project-handlers/`.
3. Regístralo en `electron/ipc.ts`.
4. Expónlo en `electron/preload.cts`.
5. Añade el tipo en `src/types/trama-api.d.ts`.
6. Crea la acción en `src/features/project-editor/use-project-editor-file-actions.ts`.
7. Conecta el botón/menú que dispara la acción.

### El editor hace algo raro al escribir
Los culpables habituales, en orden:
1. **Debounce** → `rich-markdown-editor-serialization.ts`. ¿Captura bien el editor en el closure?
2. **Sync externo** → `rich-markdown-editor-external-sync.ts`. ¿Está comparando bien los valores?
3. **Sincronización de imágenes** → `rich-markdown-editor-value-sync.ts`. ¿Los placeholders se hidratan bien?
4. **Modo focus** → `rich-markdown-editor-focus-scope*.ts`. ¿El Highlights API interfiere?
5. **Layout directives** → `rich-markdown-editor-layout-*.ts`. ¿Center/spacer/pagebreak rompen algo?

### La sidebar no muestra lo que debería
1. ¿Problema de rutas? → `sidebar-panel-logic.ts` (scoping) y `sidebar-panel-body.tsx` (conversión).
2. ¿Carpetas vacías no aparecen? → `project-scanner.ts` + `sidebar-tree-logic.ts`.
3. ¿El filtro no funciona? → `sidebar-filter.tsx` + `sidebar-panel-logic.ts`.
4. ¿Drag and drop raro? → `use-sidebar-tree-drag-handlers.ts` + `sidebar-file-drop-logic.ts`.
5. ¿Se expanden carpetas solas? → `use-sidebar-tree-expanded-folders.ts`.

### El split pane no sincroniza bien
1. ¿El dirty badge está en el pane equivocado? → Verifica que el `onChange` del editor pasa el `pane` explícito.
2. ¿Al cambiar de pane no se actualiza? → `use-project-editor-layout-actions.ts`.
3. ¿Problemas de persistencia? → `use-workspace-layout-state.ts`.
4. Referencia canónica: `docs/architecture/split-pane-coordination.md`.

### Quiero exportar el libro
Pipeline: seleccionas formato → `book-export-dialog.tsx` recoge opciones → `use-book-export.ts` llama IPC → `book-export-handler.ts` valida → `book-export-service.ts` orquesta → escanea `book/` → ordena con `corkboardOrder` → sanitiza → renderiza (PDF/DOCX/EPUB/HTML/MD) → escribe archivo.

---

## Las 10 trampas más comunes (de lessons-learned)

| # | Trampa | Causa raíz |
|---|--------|------------|
| 1 | Rutas de sidebar ≠ rutas de IPC | La sidebar quita el prefijo de sección; IPC necesita ruta completa |
| 2 | onChange del editor sin pane explícito | Usa el activePane y causa bugs de timing en split |
| 3 | `quill.getText()` omite embeds | Los índices de texto plano no coinciden con índices de documento |
| 4 | `quill.getBounds()` es relativo al container | No a la ventana ni al elemento raíz |
| 5 | Quill re-inicializa con deps inestables | Las deps de init deben ser estables; flags dinámicos van en efectos separados |
| 6 | Imágenes: placeholder vs base64 | Dos representaciones del mismo contenido; comparar sin normalizar = re-render destructivo |
| 7 | `display:none` en grid rompe columnas | Quita el elemento del grid; hay que recalcular `grid-template-columns` |
| 8 | `corkboardOrder` con doble scoping | Reconciliación usa claves project-relative; DnD usa section-relative |
| 9 | Debounce captura refs obsoletas | El timer debe capturar `editor`/`documentId` en closure, no leer refs al disparar |
| 10 | ESC global ignora modales | Debe comprobar `[aria-modal="true"]` antes de actuar |

---

## Flujo de datos resumido

```
Abrir proyecto → Scanear disco → Reconciliar índice → Enviar snapshot al renderer → Construir árbol sidebar

Seleccionar archivo → workspaceLayout actualizado (síncrono) → Cargar documento (async) → Renderizar en Quill

Escribir en editor → Quill emite evento → Debounce (300ms) → Serializar HTML→Markdown → Guardar en estado → Autosave IPC

Guardar en disco → IPC:document:save → Escribir .md → Reconciliar índice → Reconstruir TagIndex → Marcar watcher como interno

Cambio externo → Watcher detecta → Clasifica interno/externo → Si externo: recargar proyecto → Reconstruir sidebar

Modo focus → Sidebar display:none + grid 1fr → CSS Highlights API dimmea texto fuera del scope → ESC sale
```

---

## Si no entiendes algo

1. Mira `docs/flows/` si es una secuencia de acciones ("qué pasa cuando hago X").
2. Mira `docs/lessons-learned/` si es un comportamiento raro o contra-intuitivo.
3. Mira `docs/architecture/` si necesitas entender el diseño completo de un subsistema.
4. Añade logs temporales y ejecuta `npm run dev` para ver el flujo en vivo.
