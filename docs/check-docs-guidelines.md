Verifica que la documentación de arquitectura sea consistente con la implementación real. Haz tres pasadas:

**Pasada 1 — Traza el dato en sentidoforward**
Parte del punto donde la documentación dice que algo se origina (ej. "reorder envía IDs"). Sigue ese dato paso a paso desde el origen hasta el destino sin saltar pasos. Reporta cada punto donde la docs describen un tipo/valor/estructura diferente al código.

**Pasada 2 — Traza el dato en sentido inverso**
Parte del consumidor final (ej. `book-export-order.ts` leyendo `corkboardOrder`). Recorre el dato en dirección inversa hasta su origen. Compara contra lo que la docs dicen sobre ese mismo flujo. Reporta divergencias.

**Pasada 3 — Verificación cruzada de invariantes**
Para cada sección de la documentación, identifica: (a) qué datos se persisten, (b) quién los escribe, (c) quién los lee. Verifica que writers y readers usen el mismo esquema, namespace de keys, y tipos de valor. Reporta cualquier mismatch.

**Formato de respuesta:**

Inconsistencias encontradas
Para cada inconsistencia:

* Qué dice la docs
* Qué hace el código
* Archivo y línea del código
* Gravedad: alta/media/baja
Si no hay inconsistencias, dice "Documentación consistente con implementación."

**Reglas:**
- No resumas el código — cita línea y archivo específicos
- No supongas que "reconciliación" significa lo mismo en docs y código sin verificar los pasos reales
- Si la docs usan un término diferente al código para la misma variable/función, reclasifica eso como potencial inconsistencia
- Solo reporta inconsistencias, no sugieras fixes