# Formato de archivo `.zulu` — ZuluPad

## 1. Descripción general

ZuluPad es una aplicación de notas personales tipo wiki escrita en C++ con **wxWidgets**. Los documentos se almacenan en archivos `.zulu`, que son archivos **XML en texto plano** procesados con la librería **TinyXML**.

| Propiedad | Valor |
|-----------|-------|
| Formato | XML texto plano |
| Librería XML | TinyXML (embebida en `/tinyxml/`) |
| Compresión | Ninguna |
| Cifrado | Ninguno |
| Versión de app | `ZuluPad 0.42` (`zuluSettings.h:4`) |
| Versionado de formato | No existe campo de versión en el XML |
| Modo de apertura para guardar | `"w"` (texto) |
| Modo de apertura para cargar | `"rb"` (binario, normaliza EOL) |

## 2. Estructura del archivo XML

```xml
<?xml version="1.0" ?>
<!-- ZuluPad Document -->
<ZuluDoc>
    <date>1234567890</date>
    <docname><![CDATA[nombre del documento]]></docname>
    <index>
        <name>Index Page</name>
        <content><![CDATA[contenido de la página índice]]></content>
    </index>
    <content>
        <page>
            <name><![CDATA[Título de Página]]></name>
            <content><![CDATA[contenido de la página]]></content>
        </page>
        <page>
            <name><![CDATA[Otra Página]]></name>
            <content><![CDATA[más contenido]]></content>
        </page>
    </content>
</ZuluDoc>
```

## 3. Elementos del XML

### `<ZuluDoc>`
Elemento raíz. Todo archivo `.zulu` tiene uno solo.

### `<date>`
Timestamp Unix (segundos desde epoch) como string. Se actualiza cada vez que se guarda el documento (`UpdateNode()`, `zulupadwindow.cpp:1572-1573`).

### `<docname>`
Nombre del documento, envuelto en CDATA. Usado por ZuluSync para sincronización en red. Añadido en la versión 0.3, por lo que el código verifica su existencia al cargar para compatibilidad hacia atrás (`zulupadwindow.cpp:1724-1737`).

### `<index>`
Contenedor de la página índice. Es una página especial que **siempre existe** y no puede ser eliminada (`zulupadwindow.cpp:1372`). Contiene:
- `<name>` — Siempre `"Index Page"` (hardcodeado, `zulupadwindow.cpp:1637`).
- `<content>` — Texto de la página índice en CDATA.

### `<content>`
Contenedor de todas las páginas creadas por el usuario (excluyendo la página índice). Contiene cero o más elementos `<page>`.

### `<page>`
Representa una página del usuario. Contiene:
- `<name>` — Título de la página (CDATA), usado como palabra de enlace interno. No puede contener `]]>` (`zulupadwindow.cpp:619`).
- `<content>` — Cuerpo de la página (CDATA).

## 4. Uso de CDATA

**Todos los campos de texto** se envuelven en secciones CDATA (`<![CDATA[...]]>`). El código marca explícitamente cada nodo de texto con `->ToText()->SetCDATA(true)` (ej. `zulupadwindow.cpp:1630, 1642, 1596`).

Esto permite que el contenido pueda incluir caracteres especiales de XML (`<`, `>`, `&`, etc.) sin romper el parser.

## 5. Texto enriquecido

ZuluPad **no soporta texto enriquecido**. Todo el contenido se almacena como texto plano dentro de las secciones CDATA del XML. El control de edición (`editbox.cpp`) solo define tres estilos a nivel de carácter:

| Estilo | Descripción |
|--------|-------------|
| `TEXT_STYLE_DEFAULT` | Texto normal sin formato |
| `TEXT_STYLE_HOTSPOT` | Enlace interno (palabra que coincide con el nombre de una página). Se muestra en azul subrayado. |
| `TEXT_STYLE_INCOMPLETE_HOTSPOT` | Palabra que se está escribiendo y coincide parcialmente con el nombre de una página existente. |

No existe soporte para negritas, cursivas, subrayado manual, tamaños de fuente, colores, imágenes, tablas ni ningún otro tipo de formato enriquecido. La única decoración visual es el resaltado automático de enlaces wiki (hotspots).

## 6. Sistema de enlaces internos (linking)

El sistema de navegación tipo wiki funciona así:

1. Al cargar un archivo, los nombres de todas las páginas (`<page>/<name>`) se añaden al array `daLinkWords` del control de edición (`editbox.h:67`).
2. Las palabras que coinciden con nombres de página se renderizan como `TEXT_STYLE_HOTSPOT` (azul subrayado).
3. Al hacer clic en un hotspot:
   - `UpdateNode()` guarda los cambios de la página actual al XML.
   - Se busca el nodo `<page>` con el `<name>` correspondiente.
   - Se carga su `<content>` en el control de edición.
   - Se registra la navegación en `zuluPageStack` para historial de navegación.

## 7. Flujo de guardado (`FileSave` / `FileSaveas`)

Archivo: `zulupadwindow.cpp`

1. **`UpdateNode()`** (`zulupadwindow.cpp:1563`):
   - Actualiza `<date>` con el timestamp actual.
   - Obtiene el texto del control de edición (`m_edit->GetText()`).
   - Elimina caracteres `\r` sobrantes de versiones antiguas.
   - Escribe el texto en el `<content>` de la página actual (buscando por `<name>`).
2. **`zuluDoc.SaveFile(path)`** (`tinyxml.cpp:1146`):
   - Abre el archivo en modo `"w"`.
   - Imprime el XML con indentación de 4 espacios.

## 8. Flujo de carga (`OpenDocument`)

Archivo: `zulupadwindow.cpp:1683-1786`

1. Diálogo de archivo con filtro `*.zulu`.
2. `zuluDoc.LoadFile(path)` — carga el XML con encoding por defecto.
3. Obtiene el elemento raíz `ZuluDoc`.
4. Lee el nombre y contenido de la página índice.
5. Verifica/crea el elemento `<docname>` (compatibilidad hacia atrás).
6. Itera los `<page>` de `<content>` para poblar `daLinkWords`.
7. Muestra el contenido de la página índice en el editor.

## 9. Compatibilidad hacia atrás

El formato no tiene un campo de versión. La compatibilidad se maneja caso por caso en el código:

- **`<docname>`**: Si no existe al cargar (archivos anteriores a v0.3), se crea automáticamente (`zulupadwindow.cpp:1724-1737`).
- **`\r`**: Caracteres de retorno de carro sobrantes de versiones antiguas se eliminan al guardar (`zulupadwindow.cpp:1578`).

## 10. Codificación

ZuluPad (C++/wxWidgets en Windows) guarda los `.zulu` en **Latin-1 (CP1252)** por defecto. El archivo XML no declara encoding — la declaración es simplemente `<?xml version="1.0" ?>`. La lectura como UTF-8 produce caracteres de reemplazo (`\uFFFD`) en caracteres acentuados (á, é, í, ó, ú, ñ).

La codificación subyacente es byte-a-byte Latin-1, procesada por TinyXML sin conversión. El contenido CDATA preserva los bytes originales.

## 11. Archivos fuente relevantes

| Archivo | Propósito |
|---------|-----------|
| `zulupadwindow.cpp` | Guardado, carga, nuevo documento, gestión de páginas, manipulación del árbol XML |
| `zulupadwindow.h` | Declaraciones de `zuluDoc`, `zuluRootNode`, `openFilePath`, etc. |
| `editbox.cpp` | Control de edición: gestión de palabras de enlace, estilos, seguimiento de cambios |
| `editbox.h` | Declaraciones del control de edición: `daLinkWords`, flag `saveNeeded` |
| `zulupad.cpp` | Punto de entrada: dispara `OpenAction()` al iniciar |
| `zuluSettings.h` | Constantes de versión (`zuluVersion`) y configuración |
| `tinyxml/tinyxml.cpp` | Parser/escritor XML: `LoadFile`, `SaveFile`, `Print`, manejo de CDATA |
| `tinyxml/tinyxml.h` | Definiciones de tipos XML, enum de encoding |
| `tinyxml/tinystr.h` | Clase de string personalizada para TinyXML |