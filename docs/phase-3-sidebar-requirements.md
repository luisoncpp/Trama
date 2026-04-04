# Requerimientos de Sidebar (Panel Izquierdo)

Fecha: 2026-04-04
Estado: Propuesta de requerimientos funcionales y técnicos
Referencia: DESIGN_SPEC.md, REQUIREMENTS.md, docs/current-status.md

## 1. Objetivo

Definir el comportamiento y alcance de una sidebar completa para Trama, alineada al enfoque file-first y al flujo de escritura/worldbuilding.

La sidebar debe evolucionar desde el estado actual (lista plana de archivos) hacia una experiencia de navegación estructurada similar a un explorador de conocimiento:
- Rail global de secciones.
- Árbol jerárquico expandible/colapsable.
- Búsqueda/filtro de nodos.
- Acciones de creación contextual (artículo/categoría).
- Integración con panel de editor, conflictos externos e indexación.

## 2. Estado Actual (Gap Principal)

Implementado hoy:
- Lista plana de archivos markdown visibles.
- Selección de archivo activo.
- Menú de proyecto básico (abrir carpeta/estado).

No implementado aún:
- Árbol real por carpetas y subcarpetas.
- Agrupaciones semánticas y navegación de secciones.
- Acciones de creación desde sidebar.
- Filtro avanzado y controles de orden visual.
- Persistencia del estado visual de sidebar (expandido/colapsado, sección activa, ancho).

## 3. Alcance Funcional de la Sidebar

## 3.1 Rail global (nivel 1)

La columna más a la izquierda debe funcionar como lanzador de áreas de trabajo del proyecto.

Requerimientos:
- Mostrar iconos de módulos principales (ejemplo inicial):
  - Tree/Explorer (árbol de documentos).
  - Corkboard (fase posterior, placeholder permitido).
  - Timeline/Planner (placeholder permitido).
  - Settings del proyecto.
- Mostrar estado activo de sección con señal visual fuerte.
- Soportar tooltips accesibles para cada icono.
- Permitir colapso/expansión del rail secundario (panel de árbol).

Criterios de aceptación:
- El usuario puede cambiar de sección sin perder documento abierto.
- La sección activa persiste entre reinicios.

## 3.2 Panel de árbol (nivel 2)

El panel principal de sidebar debe representar la estructura real del filesystem (carpetas/archivos) con comportamiento de árbol.

Requerimientos:
- Renderizar carpetas y archivos con jerarquía real.
- Expandir/colapsar nodos de carpeta.
- Seleccionar archivo para abrirlo en editor.
- Doble click opcional para renombrar (fase posterior), pero click simple debe abrir.
- Soportar virtualización o render incremental si el proyecto es grande.

Reglas de datos:
- Fuente de verdad: filesystem + reconciliación de .trama.index.json.
- Si un archivo desaparece por cambio externo, el árbol se refresca sin romper selección activa.
- Si aparece un archivo nuevo, se muestra automáticamente según reglas de reconciliación.

Criterios de aceptación:
- Un proyecto con estructura profunda se puede navegar sin latencia perceptible.
- El árbol se actualiza con eventos externos del watcher.

## 3.3 Filtro/Búsqueda

Requerimientos:
- Campo de filtro en la parte superior del panel.
- Filtrado por nombre de archivo y ruta relativa.
- Debounce para evitar recalcular en cada tecla.
- Resaltar coincidencias en el texto del nodo.
- Opción de limpiar filtro rápidamente.

Comportamiento esperado:
- Con filtro activo, se deben expandir automáticamente rutas que contienen resultados.
- Al limpiar el filtro, restaurar estado anterior de nodos expandidos.

Criterios de aceptación:
- El usuario puede localizar un archivo por nombre parcial en menos de 3 interacciones.

## 3.4 Acciones de creación (inferior del panel)

Requerimientos:
- Botones rápidos mínimos:
  - Nuevo Artículo (archivo markdown).
  - Nueva Categoría (carpeta).
- Si hay carpeta seleccionada, crear dentro de ella.
- Si no hay selección, crear en raíz del proyecto o en carpeta por defecto configurable.
- Validar nombres inválidos para Windows y prevenir colisiones.
- Tras crear, seleccionar y abrir el nuevo archivo si aplica.

Fase 3 puede incluir:
- create file/folder básico por IPC.

Criterios de aceptación:
- Crear artículo y categoría actualiza sidebar y editor sin reiniciar app.

## 3.5 Persistencia de estado de Sidebar

Se debe persistir, como mínimo:
- Sección activa del rail global.
- Ancho del panel sidebar.
- Estado expandido/colapsado por carpeta.
- Último filtro usado (opcional, recomendable).

Almacenamiento recomendado fase 3:
- localStorage con claves namespaced.
- Abstracción de storage para futura migración a config de proyecto.

Criterios de aceptación:
- Al reiniciar, el usuario recupera contexto visual sin reconfigurar.

## 4. Requerimientos de UX/UI

## 4.1 Estructura visual mínima

La sidebar debe componerse de:
- Rail global angosto con iconografía.
- Header del panel (sección + control de orden/filtro).
- Campo de búsqueda/filtro.
- Árbol navegable con iconos de carpeta/archivo/tipo.
- Footer con acciones principales.

## 4.2 Comportamientos UX

- Hover y foco diferenciables (teclado/mouse).
- Indicador claro de nodo activo.
- Estado loading skeleton para apertura de proyecto.
- Empty states:
  - Sin carpeta abierta.
  - Carpeta abierta sin markdown.
  - Filtro sin resultados.
- Accesibilidad: navegación por teclado (flechas, enter, espacio, escape en búsqueda).

## 4.3 Responsive

- En anchos reducidos, permitir colapso total del panel de árbol.
- Mantener rail global visible o accesible por toggle.
- No bloquear interacción del editor principal.

## 5. Integración Técnica

## 5.1 Renderer

Módulos objetivo:
- src/features/project-editor/components/sidebar/sidebar-panel.tsx
- src/features/project-editor/project-editor-view.tsx
- src/features/project-editor/use-project-editor-state.ts
- src/features/project-editor/use-project-editor-ui-actions.ts
- src/features/project-editor/project-editor-types.ts

Requerimientos técnicos:
- Separar componente actual en subcomponentes:
  - sidebar-rail
  - sidebar-tree-header
  - sidebar-filter
  - sidebar-tree
  - sidebar-footer-actions
- Mantener estado de UI desacoplado del estado de documento.

## 5.2 IPC/Main Process

Para sidebar completa en fase 3, mínimo deseable:
- Reusar openProject + watcher para refresco.
- Agregar endpoints para creación básica:
  - createDocument(path, initialContent?)
  - createFolder(path)
- Validación de payload con zod y envelopes existentes.

Posibles archivos:
- src/shared/ipc.ts
- src/types/trama-api.d.ts
- electron/preload.cts
- electron/ipc/handlers/project-handlers/*
- electron/services/document-repository.ts
- electron/services/project-scanner.ts

## 6. Reglas de Negocio para Árbol y Orden

- El orden por defecto debe reflejar estructura de filesystem.
- Si existe orden custom en index para vistas futuras (corkboard), no debe romper la vista de árbol base.
- Nodos inválidos o metadata corrupta no deben romper el render; mostrar fallback seguro.
- Eventos externos deben actualizar nodos afectados sin forzar recarga completa del proyecto cuando no sea necesario.

## 7. Escenarios de Uso Clave

Escenario A: Navegación rápida
- Usuario abre proyecto, expande Lore > Personajes, selecciona archivo y empieza a editar.

Escenario B: Captura rápida
- Usuario crea Nueva Categoría y luego Nuevo Artículo dentro de esa categoría en menos de 10 segundos.

Escenario C: Cambio externo
- Google Drive agrega/borra archivo; sidebar refleja cambio y conserva, si es posible, contexto de navegación.

Escenario D: Proyecto grande
- Usuario filtra por nombre parcial y navega directo al resultado sin recorrer árbol manualmente.

## 8. Pruebas Requeridas

Unitarias:
- Construcción de árbol desde lista de rutas.
- Persistencia/restauración de estado de nodos expandidos.
- Lógica de filtrado y expansión automática por búsqueda.

Integración:
- Selección de archivo desde árbol abre documento correcto.
- Creación de archivo/carpeta actualiza árbol y selección.
- Eventos externos (add/unlink/change) sincronizan sidebar.

IPC/contrato:
- Validación de payloads createDocument/createFolder.
- Manejo de errores por colisión de nombre/ruta inválida.

Smoke manual:
- Proyecto real con 200+ archivos markdown y carpetas profundas.
- Flujo completo con filtro, creación y navegación por teclado.

## 9. Criterios de Aceptación (DoD Sidebar)

Se considera completa la sidebar cuando:
- Existe rail global funcional con sección activa persistente.
- Existe árbol jerárquico expandible/colapsable y seleccionable.
- Existe filtro usable con resultados y estado vacío.
- Existen acciones de creación de artículo/categoría operativas.
- El estado visual principal se restaura al reiniciar.
- Pasan pruebas unitarias/integración/IPC vinculadas al panel.
- No hay regresiones del flujo Phase 2 (open/edit/autosave/conflict).

## 10. Priorización Recomendada

P0 (imprescindible fase 3):
- Árbol jerárquico real.
- Filtro.
- Persistencia de estado visual.
- UX de selección robusta.

P1 (muy recomendado fase 3):
- Acciones crear artículo/categoría.
- Rail global funcional.
- Navegación por teclado sólida.

P2 (puede moverse a fase 4 si hay presión):
- Orden visual avanzado y shortcuts extendidos.
- Renombrar/mover desde sidebar.
- Integración profunda con wiki/backlinks en panel secundario.

## 11. Notas de Alineación con Diseño

Este documento se alinea con:
- REQUIREMENTS.md: pantalla dividida real, estructura semántica, experiencia de organización.
- DESIGN_SPEC.md: arquitectura file-first, watcher externo, reconciliación de index y escalabilidad.

La sidebar no debe ser un listado estático; debe convertirse en el centro de navegación de conocimiento del proyecto.
