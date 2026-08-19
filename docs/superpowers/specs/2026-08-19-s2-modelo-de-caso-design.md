# S2 — Modelo de caso ampliado

Fecha: 2026-08-19
Estado: aprobado, listo para plan de implementacion

## Contexto

Las maquetas de escritorio muestran seis cosas del caso que el modelo no tiene.
No son adornos de la maqueta: son datos que el usuario ya intenta meter a mano
en la descripcion porque no hay campo donde ponerlos.

| # | Que | Donde aparece en la maqueta | Hoy |
|---|-----|------------------------------|-----|
| 1 | Titulo ("Perro mestizo, herido") | panel del mapa, Mis Casos, preview del wizard | no existe, y el wizard no lo pide |
| 2 | Codigo publico (`#C-1042`) | monoespaciado sobre la foto | no existe |
| 3 | Estado del animal ("Herido") | KV de la ficha | `condition`, texto libre casi siempre vacio |
| 4 | Cuando lo viste | paso 2 del wizard | solo `createdAt` |
| 5 | Especie Ave | paso 1 del wizard | enum sin `ave` |
| 6 | Tercer tipo: "Vi un animal en riesgo" | paso 1 del wizard | `listingType` es `found` o `lost` |

Los voluntarios con ETA que salen en esas pantallas son **S3**; los
avistamientos, **S7**. No entran.

Las maquetas viven en `diseño/10_Pet_diseño2/desktop/` (fuera de git). La de
este encargo es `Reportar Desktop.html`; no hay maqueta de "detalle de caso"
—la ficha vive dentro de `Mapa Desktop.html`.

### Decisiones de alcance ya tomadas

1. **Entran los seis, tocando el wizard actual.** Una sola migration. Reportar
   se redisena igual en S6, pero los datos entran ya.
2. **Titulo sugerido derivado y editable.** Los casos viejos se rellenan con el
   derivado.
3. **El codigo se muestra y se copia**, con indice unico desde el dia uno, para
   que buscar por codigo o servir una URL corta no pidan otra migration.
4. **Estado: enum nuevo, se retira `condition`.** El texto libre se vuelca a la
   descripcion.
5. **El tercer tipo cambia solo la etiqueta**, el chip y el filtro. Se comporta
   igual que `found`: mismo wizard, misma ficha, mismo orden.

## S2.1 — Migration

Un solo archivo, `20260819000000-case-model-s2.js`.

### Columnas nuevas en `cases`

| columna | tipo | null | notas |
|---------|------|------|-------|
| `title` | `VARCHAR(120)` | NOT NULL | se agrega nullable, se rellena, se pone NOT NULL |
| `public_code` | `VARCHAR(12)` | NOT NULL UNIQUE | default: `C-` concatenado con `nextval('cases_public_code_seq')` |
| `animal_condition` | `VARCHAR(20)` | NULL | CHECK `cases_animal_condition_check` |
| `seen_at` | `TIMESTAMPTZ` | NULL | backfill `= created_at` |

`cases_animal_condition_check`: `herido, sano, asustado, debil,
no_pude_acercarme`.

### El codigo lo genera Postgres

`CREATE SEQUENCE cases_public_code_seq START 1000`, y la columna lo toma por
`DEFAULT`. Dos razones:

- **Sin carrera.** Calcularlo en el servicio (`max + 1`) da codigos duplicados
  con dos publicaciones simultaneas; `nextval` no.
- **El INSERT no lo escribe.** Sale por el `RETURNING`, igual que `id`.

El `UNIQUE` crea el indice, que es todo lo que hace falta para que manana una
busqueda por codigo o una URL corta no pidan otra migration.

Los ~20 casos existentes toman `C-1000` en adelante al hacer el backfill.

### CHECKs que se amplian

Espejo de los enums de Zod (ver la nota en `cases.validators.ts` y la memoria
`db_check_constraints_vs_zod`): sumar el valor en Zod sin la migration devuelve
500 al publicar.

- `cases_listing_type_check`: suma `at_risk`.
- `cases_animal_type_check`: suma `ave`.

Se sigue el patron de `20260814000000-add-animal-types-to-cases.js`: `DROP
CONSTRAINT` mas `ADD CONSTRAINT` por SQL crudo, no `addConstraint`.

### Backfill del titulo

`CASE animal_type` a etiqueta en castellano (`otro` da "Animal"), mas el tamano
si existe: "Perro mediano", "Gato". Sin estado, porque `animal_condition` nace
vacio en las filas viejas. Es una derivacion de una sola vez; la version viva
de esa logica es la del wizard (S2.3).

### Retiro de `condition`

Antes del `DROP COLUMN`, su texto se anexa a `description` con un salto doble
cuando no esta vacio. `description` es `TEXT` en la base, asi que el maximo de
2000 de Zod no se viola por concatenar.

**Consecuencia asumida:** hoy `condition` tiene doble vida. En `found` es la
condicion del animal, pero el wizard lo re-etiqueta como *"Senas particulares"*
cuando el tipo es `lost` (`PublishCasePage.tsx:985`). El enum nuevo no le sirve
a una mascota perdida, asi que en `lost` no se pide estado y las senas pasan a
ser parte de la descripcion —que es donde ya viven el color y el tamano. La
alternativa era conservar una columna de texto libre solo para eso: una columna
por un campo opcional que nadie filtra.

### `down()`

Reversible salvo un detalle: el texto que se volco a la descripcion no se
vuelve a separar. Se documenta en el archivo.

## S2.2 — Contrato del API

Tres archivos definen el trato entre backend y frontend: `cases.validators.ts`
(que se acepta), los cinco SELECT de `cases.service.ts` (que se devuelve) y
`apps/web/src/types/case.ts` (el espejo TS).

### `POST /cases` — `createCaseSchema`

- `title`: `z.string().trim().min(3).max(120)`, **requerido**. El wizard siempre
  lo manda porque lo precarga. Si fuera opcional habria filas nuevas sin titulo
  y las pantallas necesitarian el fallback derivado para siempre.
- `animalCondition`: enum opcional con los cinco valores.
- `seenAt`: `z.coerce.date()` opcional, no futuro y no mas de un ano atras. Sin
  el, la ficha muestra `createdAt` como hasta ahora.
- `listingType`: `z.enum(['found', 'lost', 'at_risk'])`.
- `animalType`: suma `ave` aca, en `listCasesSchema` y en `updateCaseSchema`.
- `condition`: se va de create y de update.

**Por que `at_risk` y no `sighting`:** "avistamiento" es el vocabulario de S7.
Gastarlo aca deja dos cosas distintas llamadas igual el dia que esa feature
exista.

### `PATCH /cases/:id` — `updateCaseSchema`

Gana `title` y `animalCondition`. `publicCode` y `seenAt` **no** se editan: el
codigo es identidad y la fecha de avistamiento es un hecho declarado al
publicar.

### Respuestas

Los cinco SELECT (detalle, lista, nearby, feed, update de `cases.service.ts`)
suman `title`, `publicCode`, `animalCondition`, `seenAt`; pierden `condition`.

Sacar `condition` de las respuestas rompe el typecheck en las cuatro pantallas
que lo leen. Es deseable: obliga a visitarlas todas en vez de dejar un
`undefined` silencioso.

### Filtros y orden

`listingType` acepta `at_risk` en `listCasesSchema` y `feedCasesSchema`. **No**
se agrega filtro por `animalCondition`: nadie lo pidio y el filtro del mapa ya
tiene seis controles.

`buildFeedOrderBy` cambia la firma a `'found' | 'lost' | 'at_risk'` y `at_risk`
cae en la rama de urgencia, igual que `found` (decision 5). Un test lo fija,
para que cambiarlo manana sea deliberado y no un descubrimiento.

### Modelo Sequelize

`case.model.ts` declara `AnimalType = 'perro'|'gato'|'otro'` desde antes de que
existieran caballo y vaca: el tipo quedo viejo porque el servicio va por SQL
crudo y nunca lo toco. Se pone al dia con los seis valores y se le suman las
columnas nuevas. Es el ordenamiento que la nota de S2 dejaba pendiente, y S2 es
la tanda que toca el enum.

## S2.3 — Wizard

Mismo orden de pasos que hoy (0 tipo, 1 Fotos, 2 Ubicacion, 3 Descripcion, 4
Contacto). El reordenamiento de la maqueta —"Que encontraste / Donde y cuando /
Fotos y detalles / Contacto"— es **S6**.

- **Paso 0:** tercera tarjeta, "Vi un animal en riesgo".
- **Paso 2:** "Cuando lo viste", con los chips exactos de la maqueta: *Ahora
  mismo, Hace menos de 1 hora, Hoy mas temprano, Ayer, Otra fecha*. Los cuatro
  primeros calculan un timestamp contra el reloj del cliente. "Otra fecha" abre
  un `input[type=date]` y guarda **mediodia local**, para que la zona horaria no
  corra el dia publicado al anterior.
- **Paso 3:** el chip Ave como sexta especie; un input **Titulo** arriba de
  todo, precargado; y el textarea "Condicion" reemplazado por chips de estado,
  solo en `found` y `at_risk`.
- **Paso 4:** el preview muestra el titulo. El codigo **no**, porque todavia no
  existe: lo genera Postgres al insertar. Aparece recien en la pantalla del
  caso ya publicado.

### La regla del titulo sugerido

Una funcion pura, `sugerirTitulo(especie, tamano, estado)` que devuelve "Perro
mediano, herido". Se recalcula sola **mientras el usuario no lo haya tocado**;
en cuanto edita el input, deja de pisarse. Es la unica logica no obvia de la
tanda: va aislada en su propio modulo y con test propio.

## S2.4 — Donde se muestra

Hoy ninguna pantalla tiene encabezado: la tarjeta muestra la descripcion
recortada a dos lineas y la ficha la muestra como cuerpo. El titulo pasa a ser
encabezado en cuatro lugares:

- `CaseCard.tsx:98` (la compartida)
- `CaseDetailSheet.tsx:320`
- `CasePage.tsx:294`
- `DashboardPage.tsx:257` (hay una `CaseCard` propia ahi; son dos componentes
  distintos con el mismo nombre, se tocan los dos)

En la ficha se suman ademas el `#C-1042` monoespaciado con boton de copiar, el
estado en el KV y el "visto" derivado de `seenAt`.

El mapa no necesita cambio propio: no arma popup HTML, abre `CaseDetailSheet`.

**Cambio de contenido, no de estilo.** El look de la maqueta lo traen S4 (Mapa)
y S6 (Reportar).

## Testing

**api**

- Validators: titulo requerido, cotas de `seenAt`, `at_risk` y `ave` aceptados,
  `condition` rechazado.
- Integracion: crear y leer verificando que `publicCode` vuelve y que dos casos
  seguidos no comparten codigo.
- Ordering: `at_risk` ordena por urgencia.

**web**

- La derivacion del titulo (funcion pura).
- Que editar el titulo corta la re-derivacion.

**migration**

- `up` y `down` corridos en dev antes del PR.
- Verificar que los ~20 casos viejos quedan con titulo y con codigo.

## Riesgos

- **El backfill del titulo corre una vez y no se puede repetir** sin pisar
  titulos que el usuario haya editado. Si el backfill sale mal, la correccion
  es manual sobre las filas afectadas.
- **`condition` se pierde como campo estructurado.** El texto sobrevive dentro
  de la descripcion, pero deja de ser consultable por separado.
- **Los chips de "cuando" dependen del reloj del cliente.** Un dispositivo con
  la hora mal manda un `seenAt` mal. Las cotas del validator acotan el dano
  (nada futuro, nada de mas de un ano) pero no lo eliminan.

## Fuera de alcance

- Buscar por codigo, y la URL corta. La migration deja el indice listo; la
  feature no entra.
- Filtro por estado del animal.
- El rediseno de Reportar (S6) y del Mapa (S4).
- Voluntarios con ETA (S3) y avistamientos (S7).
