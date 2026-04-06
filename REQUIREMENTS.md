Documento de Diseño: Trama

1. Visión General

Una aplicación de escritorio local ("File-First") diseñada para escritores y worldbuilders, enfocada en la gestión de manuscritos largos, organización de lore complejo y sincronización fluida mediante el sistema de archivos local.

2. Stack Tecnológico

Contenedor / Backend: Electron.js (Permite acceso nativo al sistema de archivos mediante Node.js).

Frontend: Preact (con preact/compat si se requieren librerías exclusivas de React).

Estilos: Tailwind CSS.

Almacenamiento: Archivos .md locales (Markdown con YAML Frontmatter).

3. Funcionalidades Principales (MVP)

3.1. Organización y Estructura Visual

Estructura de Árbol Semántica: Panel lateral con carpetas y subcarpetas (Actos, Capítulos, Escenas, Lore, Personajes, Lugares, Organizaciones, etc.), usando iconografía específica (ej. ícono de castillo para locaciones, ícono de persona para personajes).

Pizarra de Corcho (Corkboard): Vista de tarjetas drag-and-drop para planificar y reorganizar escenas o ideas.

3.2. Espacio de Trabajo

Pantalla Dividida Real: Capacidad de tener múltiples paneles (ej. editor principal a la izquierda, notas/wiki a la derecha).

Modo Oscuro / Pantalla Completa: Soporte nativo y sin distracciones.

3.3. Edición y Enlazado

Soporte Nativo de Markdown: Editor principal basado en Markdown.

Soporte de Imágenes: Renderizado de imágenes dentro del documento, soportando tanto rutas locales/enlaces externos como imágenes incrustadas directamente en formato Base64.

Autocompletado y Enlaces Bidireccionales: Sistema tipo Wiki ([[Personaje]]) que permite referenciar elementos del lore y ver tooltips o navegar a la nota.

Plantillas (Templates): Posibilidad de crear nuevos documentos basados en esquemas predefinidos (ej. "Ficha de Personaje", "Ficha de Locación").

Metadatos por Escena: Uso de YAML Frontmatter en los archivos .md para almacenar etiquetas, estado, personajes involucrados, etc.

3.4. Interoperabilidad e IA

Sincronización: Delegada al cliente de escritorio de Google Drive (la app lee/escribe en un directorio local sincronizado).

Importación Estructurada (IA): Función de "Importar desde Portapapeles" que analiza texto generado por un LLM (ej. === ARCHIVO: nombre.md ===\n---YAML---\nContenido) y crea/actualiza múltiples archivos locales automáticamente.

Exportación Flexible: 1. Compilación Única: Generar un solo documento Markdown consolidado con todo el proyecto (o carpetas seleccionadas, como el Manuscrito), uniendo el contenido para lectura continua, revisión o conversión a otros formatos.
2. Exportación Estructurada (para LLMs): Seleccionar archivos específicos y exportarlos al portapapeles utilizando el mismo formato delimitado de la importación (=== ARCHIVO: nombre.md ===). Esto permite enviar fragmentos de lore o capítulos exactos como contexto a un chatbot de IA fácilmente.

4. Arquitectura de Datos (File-First)

El proyecto se almacenará como una estructura de carpetas estándar. Esto asegura que los datos no queden atrapados en una base de datos privativa.

/MiProyecto
  /Manuscrito
    /Acto1
      01_introduccion.md
      02_el_incidente.md
  /Lore
    /Personajes
      selene.md
      aris.md
    /Lugares
      cenotafio_sillonio.md
  /Plantillas
    _plantilla_personaje.md





Estructura de un archivo .md (Ejemplo: selene.md)

---
id: char_selene_01
tipo: personaje
nombre: Selene
rol: protagonista
tags: [magia, norte]
---
# Selene
Descripción general del personaje...





5. Siguientes Pasos

Inicialización: Configurar el boilerplate de Electron con Vite, Preact y Tailwind.

Módulo FileSystem: Crear las funciones en el proceso principal de Electron (Node.js) para leer el directorio del proyecto y parsear el YAML Frontmatter.

UI - Sidebar: Construir el árbol de navegación leyendo la estructura de carpetas obtenida por Node.

UI - Editor: Implementar un editor Markdown básico con panel de vista previa o modo híbrido (WYSIWYG).