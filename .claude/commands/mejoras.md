---
description: Lee la bandeja de mejoras que el admin anotó desde la web, y marca ítems como resueltos
argument-hint: "[todas | resolver <n> [nota] | descartar <n> [nota]]"
allowed-tools: mcp__supabase__execute_sql
---

Bandeja de mejoras de 10_Pet: notas que el usuario anota desde la web (botón ámbar, solo admin)
mientras testea. Viven en la tabla `improvements` del Supabase de producción, que es a la que
apunta el MCP.

No confundir con la tabla de feedback de testers: ese canal es el botón violeta, va por mail y no
toca esta tabla.

Argumento recibido: `$ARGUMENTS` (puede venir vacío).

## Qué hacer según el argumento

**Vacío** → listar pendientes:

```sql
SELECT id, note, route, created_at
FROM improvements
WHERE status = 'pending'
ORDER BY created_at DESC;
```

**`todas`** → el historial completo, incluyendo resueltas y descartadas:

```sql
SELECT id, note, route, status, resolution_notes, created_at, resolved_at
FROM improvements
ORDER BY created_at DESC;
```

**`resolver <n> [nota]`** o **`descartar <n> [nota]`** → cambiar el estado del ítem `n`.

El `<n>` es el ordinal del **listado de pendientes**, no un id. Antes de tocar nada, volvé a correr
la query de pendientes de arriba y contá desde ahí: si te guiás por un listado viejo de esta misma
conversación, podés marcar la fila equivocada. Después:

```sql
UPDATE improvements
SET status = 'resolved',      -- o 'descartado'
    resolved_at = now(),
    resolution_notes = :nota  -- NULL si no se pasó nota
WHERE id = :id;
```

Si no viene nota y estás resolviendo algo que acabás de arreglar, poné el número de PR en
`resolution_notes` (ej. `PR #105`).

## Cómo presentar el listado

Numerado, más reciente primero, una línea por ítem: el texto de la nota, la ruta entre paréntesis y
hace cuánto se anotó. No vuelques los UUID salvo que se pidan.

Si hay pendientes, cerrá proponiendo un orden de trabajo — qué agruparías en un mismo PR, qué parece
un bug real contra qué es preferencia — en vez de dejar la lista cruda. Si no hay ninguno, decilo en
una línea y nada más.
