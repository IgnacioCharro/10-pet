# Timeline visual de la historia del caso

Fecha: 2026-08-13. Estado: **diseño acordado, sin implementar.**

Reemplaza las secciones sueltas del detalle de un caso por una sola linea de tiempo
vertical, compacta y coloreada por tipo de evento, que se lee de un vistazo.

## Problema

Hoy `/cases/:id` muestra tres secciones separadas y verticales — "Historial del caso",
"Atencion veterinaria" y "Voluntarios" — cada una con su propio encabezado y su propio
estado vacio. No hay forma de ver la historia del caso como una secuencia, ni de saber
de un vistazo en que anda el animal ahora.

## Decisiones tomadas

### Forma: timeline vertical

Se descarto la version horizontal del sketch original. A 390px de ancho (el ancho real
del iPhone del usuario) entran dos hitos y medio: obliga a scroll lateral, que pelea con
el scroll vertical de la pagina y contradice el objetivo de "entenderlo de un vistazo".

Cada hito es **una linea sola**: punto de color, que paso, quien y cuando. Ocho hitos
entran en unos 190px de alto.

### El texto se despliega al tocar

El contenido de cada novedad esta colapsado por defecto. Se pueden abrir varios a la vez.
**Los hitos sin contenido no muestran la flecha de despliegue**, para no prometer algo que
no existe.

### Anclas derivadas, no guardadas

El timeline empieza y termina con dos hitos que **no son filas de `case_updates`** — se
derivan del caso y no se persisten:

- **Publicado** — de `case.createdAt`, en violeta.
- **Estado actual** — de `case.status`, en violeta ("Caso activo", "Resuelto").
  Si `resolutionType` es `fallecio` o `sin_paradero`, va en **rojo**.

Sin ellas la linea empieza y termina en el aire.

## Taxonomia final

`case_updates.update_type` es `varchar(50)`, **no un enum de Postgres**. Los tipos validos
viven en tres listas de codigo: el `z.enum` de `addUpdateSchema` en
`apps/api/src/modules/rescue/cases/cases.validators.ts`, la union `UpdateType` en
`apps/api/src/models/case-update.model.ts`, y `UPDATE_META` en
`apps/web/src/components/cases/CaseDetailSheet.tsx`.

> **CORRECCION (2026-08-14): la version original de este spec decia que agregar tipos
> "no requiere migration ni DDL". Es FALSO: los tipos nuevos no se pueden guardar.**
>
> Que no sea un enum de Postgres no significa que no este restringido: hay un CHECK
> constraint espejo. Verificado en prod el 14/08:
>
> ```
> case_updates_type_check CHECK (update_type = ANY (ARRAY[
>   'status_change','comment','photo_added','reactivated',
>   'avistamiento','medicacion','veterinario','comentario']))
> ```
>
> `alojamiento` y `salud` **no estan en esa lista**. Sumarlos al `z.enum` sin migration
> repite el bug del PR #111 (caballo y vaca): Zod deja pasar el valor y el insert pega
> contra el CHECK. Verificado el 14/08 intentando el INSERT: `23514, violates check
> constraint "case_updates_type_check"`. **Hace falta una migration de Sequelize que
> reescriba el constraint** antes de tocar las listas de codigo.
>
> A diferencia del #111 esto **no** sale como 500: el `error-handler` que ese mismo PR
> agrego mapea el codigo 23514 a un 400 con el nombre del constraint. Falla claro en vez
> de mudo, pero la novedad no se guarda igual.
>
> Ver [[db_check_constraints_vs_zod]]: cada `z.enum` de este proyecto tiene un CHECK espejo
> en Postgres.

| Tipo | Etiqueta | Color | Estado |
|---|---|---|---|
| — | Publicado | violeta `#7c3aed` | derivado de `createdAt` |
| `avistamiento` | Avistamiento | azul `#3b82f6` | ya existe |
| `alojamiento` | Cambio de alojamiento | ambar `#f59e0b` | **nuevo** |
| `salud` | Estado de salud | rosa `#ec4899` | **nuevo** |
| `veterinario` | Atencion veterinaria | teal `#14b8a6` | ya existe |
| `comentario` | Novedad | gris `#6b7280` | ya existe |
| — | Estado actual | violeta `#7c3aed` | derivado de `status` |
| — | Fallecio / Sin paradero | rojo `#ef4444` | derivado de `resolutionType` |

Tipos legacy que siguen existiendo en el modelo y hay que seguir renderizando aunque no
se ofrezcan al crear: `status_change`, `comment`, `photo_added`, `reactivated`.

### Por que estos colores

- **Rosa para "Estado de salud"** era el unico slot libre fuera de la zona azul-verde.
  Mandarlo a verde o teal dejaba cuatro tipos de siete apiñados en el mismo rango, y a
  12px los puntos dejaban de distinguirse.
- **El vet queda en teal y no pasa a verde**, aunque el pedido original decia verde: el
  teal ya es el color del veterinario en toda la app — la insignia "Profesional
  verificado", el formulario de atencion y la tarjeta de vet en `/profile`. Teal es un
  verde.
- **El rojo se reserva para el cierre malo.** Al quedar "Estado de salud" neutro, el rojo
  se libero. El unico lugar donde un rojo no miente es un final terminal y sin
  ambiguedad: `fallecio` o `sin_paradero`.

### Se elimina el tipo `medicacion`

Queda absorbido por "Atencion veterinaria". El detalle aclara si fue medicacion o
procedimiento — y eso **ya existe**: la tabla `vet_assistances` tiene las columnas
`procedure` y `medication` separadas.

**Verificado en prod el 13/08: hay 0 filas con `update_type = 'medicacion'`** (el total es
4 `comentario` y 3 `veterinario`). No hay datos viejos que preservar, la baja es limpia.

Como la migration ya va a reescribir el CHECK, conviene sacar `medicacion` de la lista en
el mismo movimiento: con 0 filas no hay riesgo de que el constraint falle al aplicarse, y
dejarlo permitiria seguir insertando un tipo que la UI ya no sabe ofrecer. Confirmar el
conteo en 0 **en el momento de correr la migration**, no confiar en esta linea.

### Nombres que se descartaron, y por que

El tipo `salud` paso por tres nombres antes de cerrar:

- **"Se lastimo"** — demasiado angosto. No cubre "dejo de comer", "tiene fiebre", "recayo".
- **"Estado" a secas** — colisiona con `case.status`, que en la misma pantalla ya se
  muestra como chip ("Abierto" / "En rescate" / "Resuelto").
- **"Observacion"** — se pisa con `avistamiento` (un avistamiento *es* una observacion) y
  con `comentario`, que ya es el cajon generico. Tres opciones genericas juntas en el
  formulario producen datos inconsistentes, porque cada persona elige distinto.

Criterio que resolvio la discusion: **un tipo vale por lo que excluye.** Si puede contener
cualquier cosa, no es un tipo, es el default — y el default ya existe.

Consecuencia aceptada explicitamente por el usuario: al quedar el tipo neutro y de color
neutro, **un problema de salud ya no salta a la vista** al escanear la columna, que era el
objetivo original ("herida o algo negativo: rojo").

## Alcance

Toca frontend, las listas de tipos del API **y una migration** que reescriba
`case_updates_type_check` (ver la correccion en "Taxonomia final").

Archivos previstos:

- `apps/api/src/db/migrations/` — nueva migration: reescribir `case_updates_type_check`
  sumando `alojamiento` y `salud`. Sobre si sacar `medicacion` del CHECK, ver mas abajo.
- `apps/api/src/modules/rescue/cases/cases.validators.ts` — `z.enum` de `addUpdateSchema`
- `apps/api/src/models/case-update.model.ts` — union `UpdateType`
- `apps/web/src/components/cases/CaseDetailSheet.tsx` — `UPDATE_META`,
  `OWNER_UPDATE_TYPES`, `OWNER_TYPE_LABELS`, y el componente `CaseTimeline`
- `apps/web/src/pages/CasePage.tsx` — consume el timeline nuevo

## Resuelto el 2026-08-14

**1 y 2 — el timeline absorbe "Atencion veterinaria".** Las `vet_assistances` se fusionan
en el mismo stream que los `case_updates`, ordenadas juntas por su dimension temporal. La
seccion separada de abajo **desaparece**. `procedure` y `medication` se muestran en el
desplegable del hito, que es el mecanismo que el spec ya preveia para el contenido. El
formulario de carga de atencion pasa a ser una accion del timeline.

Es la unica de las tres opciones que resuelve el problema declarado en este documento:
ver la historia del caso como **una** secuencia. Las otras dos dejaban la historia partida
en dos lugares, que es exactamente lo que motivo el rediseño.

Detalles que se desprenden:

- **Orden**: las asistencias tienen `attendedAt` **y** `createdAt`. Ordenar por
  `attendedAt ?? createdAt`, porque lo que importa en una linea de tiempo es cuando paso,
  no cuando se cargo.
- **Autor**: las asistencias traen `userName` e `isVet`; las novedades solo `userId`. El
  hito de asistencia puede mostrar el nombre y la insignia de profesional; el de novedad
  se mantiene como esta hoy. No hay que unificar la representacion del autor a la fuerza.
- **Hitos sin contenido**: una asistencia con `procedure` y `medication` ambos en null no
  lleva flecha de despliegue, igual que una novedad sin texto.

## Sin resolver

1. **La seccion "Voluntarios"** no se discutio. Queda como esta.
2. **Alta de los tipos nuevos en el formulario**: falta definir el texto de ayuda y el
   placeholder de `alojamiento` y `salud`, al estilo de los que ya tienen los otros.
