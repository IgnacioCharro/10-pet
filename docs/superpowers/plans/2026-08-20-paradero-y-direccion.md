# Paradero del animal y entrada de direccion — Plan de implementacion

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que la ubicacion de un caso signifique siempre "donde se vio al animal", que el wizard registre si el animal quedo en la calle o esta a resguardo, y que entrar una direccion no pueda plantar el pin en otra provincia.

**Architecture:** Se agrega la columna `whereabouts` a `cases` y se retira `at_risk` de `listing_type`, porque era el eje del estado del animal disfrazado de tipo de publicacion. La entrada de direccion pasa a anclarse al `boundingbox` de la localidad elegida (`viewbox` + `bounded=1`), y la logica de armado de queries se extrae a un modulo puro y testeable en vez de vivir suelta dentro del componente del wizard.

**Tech Stack:** Node 20 + TypeScript strict, Express + Sequelize (queries crudas para `cases`), PostgreSQL 15 + PostGIS, React 18 + Vite + Tailwind, vitest + testing-library en `apps/web`, vitest en `apps/api`, Nominatim (OpenStreetMap) para geocodificar.

**Spec:** `docs/superpowers/specs/2026-08-20-paradero-y-direccion-design.md`

## Global Constraints

- **El campo se llama `whereabouts` en el codigo y `whereabouts` en la DB.** NO se llama `paradero`: ya existe `resolution_type = 'sin_paradero'` con otro significado y dos cosas parecidas con el mismo nombre se confunden. Los **valores** si van en castellano, como `animal_condition`: `en_la_calle`, `con_quien_publica`, `con_un_tercero`, `desconocido`.
- **Van dos migrations y en orden separado.** La A es aditiva y entra con este PR. La B (retirar `at_risk` de la CHECK) se corre **despues** de verificar el deploy en produccion. Nunca las juntes: dev y prod comparten la base de Supabase, y un usuario con el bundle viejo que elija "Vi un animal en riesgo" se come un 500 si la CHECK ya se cerro.
- **Codigo en ingles, comentarios y commits en castellano.** Sin emojis en codigo ni en commits.
- **Archivos TS `kebab-case.ts`, componentes React `PascalCase.tsx`.** DB `snake_case`, Sequelize mapea a `camelCase`.
- **Zod valida todos los endpoints.** Todo valor nuevo del enum necesita su CHECK espejo en Postgres o da 500 al publicar.
- **A resguardo** = `whereabouts` en (`con_quien_publica`, `con_un_tercero`). Es la unica definicion; no la reimplementes por componente.
- Correr `pnpm --filter web typecheck` y `pnpm --filter api typecheck` antes de cada commit. **No le creas a los diagnosticos del IDE, que llegan atrasados** — corre el comando.

---

### Task 1: Migration A, modelo y validators — la columna `whereabouts`

**Files:**
- Create: `apps/api/src/db/migrations/20260820000000-add-whereabouts-to-cases.js`
- Modify: `apps/api/src/models/case.model.ts`
- Modify: `apps/api/src/modules/rescue/cases/cases.validators.ts`
- Test: `apps/api/src/modules/rescue/cases/cases.validators.test.ts`

**Interfaces:**
- Consumes: nada.
- Produces: el tipo `Whereabouts = 'en_la_calle' | 'con_quien_publica' | 'con_un_tercero' | 'desconocido'` exportado desde `apps/api/src/models/case.model.ts`; `createCaseSchema` acepta `whereabouts` y `hostName`; `listCasesSchema` acepta `sheltered?: boolean`.

- [ ] **Step 1: Escribir el test que falla**

En `apps/api/src/modules/rescue/cases/cases.validators.test.ts`, agregar:

```ts
  it('acepta whereabouts y hostName al crear', () => {
    const parsed = createCaseSchema.safeParse({
      ...baseCase,
      whereabouts: 'con_un_tercero',
      hostName: 'Marta Gimenez',
    });
    expect(parsed.success).toBe(true);
  });

  it('por defecto un caso nuevo queda en la calle', () => {
    const parsed = createCaseSchema.safeParse(baseCase);
    expect(parsed.success && parsed.data.whereabouts).toBe('en_la_calle');
  });

  it('rechaza un whereabouts que no existe', () => {
    const parsed = createCaseSchema.safeParse({ ...baseCase, whereabouts: 'en_el_veterinario' });
    expect(parsed.success).toBe(false);
  });

  it('listCases acepta el filtro sheltered', () => {
    const parsed = listCasesSchema.safeParse({ sheltered: 'false' });
    expect(parsed.success && parsed.data.sheltered).toBe(false);
  });
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `pnpm --filter api test -- cases.validators`
Expected: FAIL — `whereabouts` no esta en el schema, el default no existe.

- [ ] **Step 3: Agregar los schemas**

En `cases.validators.ts`, junto a los otros enums (despues de `animalConditionSchema`):

```ts
const whereaboutsSchema = z.enum([
  'en_la_calle', 'con_quien_publica', 'con_un_tercero', 'desconocido',
]);
```

En `createCaseSchema`, agregar:

```ts
  whereabouts: whereaboutsSchema.default('en_la_calle'),
  hostName: z.string().trim().max(120).optional(),
```

En `listCasesSchema`, agregar:

```ts
  // Sin valor no filtra nada. El mapa manda sheltered=false para esconder los
  // que ya estan a resguardo; ese es su unico uso hoy.
  sheltered: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
```

En `updateCaseSchema`, agregar dentro del objeto:

```ts
    whereabouts: whereaboutsSchema.optional(),
```

- [ ] **Step 4: Correr el test y verificar que pasa**

Run: `pnpm --filter api test -- cases.validators`
Expected: PASS

- [ ] **Step 5: Escribir la migration A**

Crear `apps/api/src/db/migrations/20260820000000-add-whereabouts-to-cases.js`:

```js
'use strict';

/**
 * Donde esta el animal ahora, que es distinto de donde se lo vio.
 *
 * La ubicacion del caso significa siempre el lugar del avistamiento: el
 * domicilio de quien rescata no entra al sistema. Esta columna dice si el
 * animal sigue ahi o si alguien lo puso a resguardo.
 *
 * Aditiva a proposito: `listing_type` no se toca aca. Retirar 'at_risk' de su
 * CHECK va en una migration posterior, despues de verificar el deploy, porque
 * dev y prod comparten base y el bundle viejo lo sigue ofreciendo.
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const q = (sql) => queryInterface.sequelize.query(sql);

    await q(`ALTER TABLE cases ADD COLUMN whereabouts VARCHAR(20) NOT NULL DEFAULT 'en_la_calle';`);
    await q(`
      ALTER TABLE cases
        ADD CONSTRAINT cases_whereabouts_check
          CHECK (whereabouts IN ('en_la_calle','con_quien_publica','con_un_tercero','desconocido'));
    `);

    // Un animal buscado no esta en ningun lado conocido: esa es toda la historia.
    await q(`UPDATE cases SET whereabouts = 'desconocido' WHERE listing_type = 'lost';`);

    // El mapa filtra por "a resguardo" en cada carga; sin esto es seq scan.
    await q(`CREATE INDEX cases_whereabouts_idx ON cases (whereabouts);`);
  },

  async down(queryInterface) {
    const q = (sql) => queryInterface.sequelize.query(sql);
    await q(`DROP INDEX IF EXISTS cases_whereabouts_idx;`);
    await q(`ALTER TABLE cases DROP CONSTRAINT IF EXISTS cases_whereabouts_check;`);
    await q(`ALTER TABLE cases DROP COLUMN whereabouts;`);
  },
};
```

- [ ] **Step 6: Agregar el campo al modelo**

En `apps/api/src/models/case.model.ts`:

Exportar el tipo cerca de los otros tipos del archivo:

```ts
export type Whereabouts =
  | 'en_la_calle' | 'con_quien_publica' | 'con_un_tercero' | 'desconocido';
```

Agregar `whereabouts: Whereabouts;` a la interfaz de atributos (junto a `animalCondition`, linea ~26), agregar `'whereabouts'` a la union de atributos opcionales de creacion (junto a `'animalCondition'`, linea ~43), agregar `declare whereabouts: Whereabouts;` (junto a `declare animalCondition`, linea ~67) y en el `init`, junto a `animalCondition`:

```ts
        whereabouts: {
          type: DataTypes.STRING(20),
          allowNull: false,
          defaultValue: 'en_la_calle',
        },
```

- [ ] **Step 7: Correr la migration y verificar la columna**

Run: `pnpm --filter api migrate`
Despues verificar contra la base:

```sql
SELECT whereabouts, count(*) FROM cases GROUP BY whereabouts;
```
Expected: 20 en `en_la_calle`, 2 en `desconocido`.

- [ ] **Step 8: Typecheck y commit**

```bash
pnpm --filter api typecheck && pnpm --filter api test -- cases.validators
git add apps/api/src/db/migrations/20260820000000-add-whereabouts-to-cases.js apps/api/src/models/case.model.ts apps/api/src/modules/rescue/cases/cases.validators.ts apps/api/src/modules/rescue/cases/cases.validators.test.ts
git commit -m "feat(api): columna whereabouts en cases"
```

---

### Task 2: El caso guarda y devuelve `whereabouts`, y abre su historial

**Files:**
- Modify: `apps/api/src/modules/rescue/cases/cases.service.ts:107-175` (createCase), y los `SELECT` de listado y detalle del mismo archivo
- Test: `apps/api/src/modules/rescue/cases/cases.integration.test.ts`

**Interfaces:**
- Consumes: `whereabouts` y `hostName` de `createCaseSchema` (Task 1); `Whereabouts` de `case.model.ts` (Task 1).
- Produces: `CaseRow` incluye `whereabouts`; `createCase` crea una novedad `alojamiento` cuando el animal no quedo en la calle.

- [ ] **Step 1: Escribir el test que falla**

En `cases.integration.test.ts`:

```ts
  it('un caso encontrado que el autor se llevo arranca con una novedad de alojamiento', async () => {
    const res = await request(app)
      .post('/api/v1/cases')
      .set('Authorization', `Bearer ${token}`)
      .send({ ...validCase, whereabouts: 'con_quien_publica' });

    expect(res.status).toBe(201);
    expect(res.body.case.whereabouts).toBe('con_quien_publica');

    const updates = await request(app).get(`/api/v1/cases/${res.body.case.id}/updates`);
    expect(updates.body.updates).toHaveLength(1);
    expect(updates.body.updates[0].updateType).toBe('alojamiento');
  });

  it('un caso que quedo en la calle arranca con el historial vacio', async () => {
    const res = await request(app)
      .post('/api/v1/cases')
      .set('Authorization', `Bearer ${token}`)
      .send({ ...validCase, whereabouts: 'en_la_calle' });

    const updates = await request(app).get(`/api/v1/cases/${res.body.case.id}/updates`);
    expect(updates.body.updates).toHaveLength(0);
  });

  it('guarda el nombre de quien lo aloja cuando lo tiene un tercero', async () => {
    const res = await request(app)
      .post('/api/v1/cases')
      .set('Authorization', `Bearer ${token}`)
      .send({ ...validCase, whereabouts: 'con_un_tercero', hostName: 'Marta Gimenez' });

    const updates = await request(app).get(`/api/v1/cases/${res.body.case.id}/updates`);
    expect(updates.body.updates[0].hostName).toBe('Marta Gimenez');
  });
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `pnpm --filter api test -- cases.integration`
Expected: FAIL — `res.body.case.whereabouts` es `undefined`.

- [ ] **Step 3: Sumar la columna al INSERT y a los SELECT**

En `createCase` (`cases.service.ts:107`): agregar `whereabouts` a la lista de columnas del INSERT, `:whereabouts` a los VALUES, `whereabouts` al RETURNING, y `whereabouts: input.whereabouts` a `replacements`.

Agregar `whereabouts` al `RETURNING`/`SELECT` de **todas** las queries del archivo que devuelven casos (listado, detalle, nearby, mis casos). Buscalas con:

```bash
grep -n 'animal_condition AS "animalCondition"' apps/api/src/modules/rescue/cases/cases.service.ts
```

Cada una de esas lineas necesita un `whereabouts,` al lado. Es `snake_case` igual en los dos lados, asi que no lleva alias.

Agregar el campo a la interfaz `CaseRow` y a `CreateCaseInput` del mismo archivo:

```ts
  whereabouts: Whereabouts;
```

```ts
  hostName?: string;
```

- [ ] **Step 4: Abrir el historial cuando el animal esta a resguardo**

En `createCase`, despues de `const newCase = result[0];` y **antes** del bloque de `notifyNewCaseQueue`:

```ts
  // El historial arranca contando la verdad: si el animal no quedo en la calle,
  // el primer hecho del caso es quien lo tiene. Reusa el tipo de novedad que ya
  // existe en vez de inventar un campo paralelo.
  if (input.whereabouts === 'con_quien_publica' || input.whereabouts === 'con_un_tercero') {
    await CaseUpdate.create({
      caseId: newCase.id,
      userId,
      updateType: 'alojamiento',
      content: null,
      hostName: input.hostName ?? null,
    });
  }
```

Verificar que `CaseUpdate` ya este importado en el archivo; si no, agregarlo al import de modelos.

- [ ] **Step 5: Correr el test y verificar que pasa**

Run: `pnpm --filter api test -- cases.integration`
Expected: PASS

- [ ] **Step 6: Aplicar el filtro `sheltered` en el listado**

En la funcion de listado de `cases.service.ts`, donde se arman los `WHERE` opcionales (buscar `animalColor` para ubicar el bloque), agregar el mismo patron:

```ts
  if (query.sheltered === false) {
    conditions.push(`c.whereabouts NOT IN ('con_quien_publica', 'con_un_tercero')`);
  } else if (query.sheltered === true) {
    conditions.push(`c.whereabouts IN ('con_quien_publica', 'con_un_tercero')`);
  }
```

Seguir el nombre real de la variable de condiciones que use el archivo.

- [ ] **Step 7: Typecheck, tests completos y commit**

```bash
pnpm --filter api typecheck && pnpm --filter api test
git add apps/api/src/modules/rescue/cases/
git commit -m "feat(api): el caso guarda su paradero y abre el historial con quien lo aloja"
```

---

### Task 3: Retirar `at_risk` del codigo (la CHECK sigue abierta)

**Files:**
- Modify: `apps/api/src/modules/rescue/cases/cases.validators.ts:16`
- Modify: `apps/api/src/modules/rescue/cases/cases.ordering.ts:27-30`
- Modify: `apps/api/src/modules/rescue/cases/cases.zone-stats.ts:38,58`
- Modify: `apps/api/src/modules/rescue/cases/cases.ordering.test.ts:83`
- Modify: `apps/api/src/modules/rescue/cases/cases.validators.test.ts:47,88`
- Modify: `apps/api/src/modules/rescue/cases/cases.zone-stats.test.ts:24-45`
- Modify: `apps/web/src/types/case.ts:8`
- Modify: `apps/web/src/lib/listingType.ts:35`
- Modify: `apps/web/src/lib/listingType.test.ts:6-13`
- Modify: `apps/web/src/components/cases/HomeFeed.tsx:33,39`
- Modify: `apps/web/src/pages/PublishCasePage.tsx:49,426`

**Interfaces:**
- Consumes: nada.
- Produces: `ListingType = 'found' | 'lost'` en web y `'found' | 'lost'` en la firma de `buildFeedOrderBy`.

**Contexto:** hay **cero** casos `at_risk` en produccion, verificado el 20/08. No hay backfill ni filas ambiguas. La CHECK de Postgres **no se toca en esta task** (va en la Task 9).

- [ ] **Step 1: Ajustar los tests primero**

En `cases.ordering.test.ts:83`, borrar el caso `at_risk` — ya no existe el valor.

En `cases.validators.test.ts`, cambiar los dos tests de `at_risk` para que ahora afirmen lo contrario:

```ts
  it('rechaza at_risk, que se retiro como tipo de publicacion', () => {
    const parsed = createCaseSchema.safeParse({ ...baseCase, listingType: 'at_risk' });
    expect(parsed.success).toBe(false);
  });
```

En `cases.zone-stats.test.ts`, reemplazar los dos tests de plegado de `at_risk` por uno solo:

```ts
  it('cuenta los found sin plegar ningun otro tipo', async () => {
    await getZoneStats({ lat: -34.6, lng: -58.4, radius: 10 });
    expect(sqlOf(0)).toContain(`c.listing_type = 'found'`);
  });
```

En `apps/web/src/lib/listingType.test.ts`, reemplazar los tres asserts de `at_risk` por:

```ts
  it('cubre exactamente los dos tipos vivos', () => {
    expect(Object.keys(LISTING_TYPE).sort()).toEqual(['found', 'lost'])
  })
```

- [ ] **Step 2: Correr los tests y verificar que fallan**

Run: `pnpm --filter api test -- cases && pnpm --filter web test -- listingType`
Expected: FAIL — el schema todavia acepta `at_risk`, el catalogo todavia lo tiene.

- [ ] **Step 3: Sacarlo del API**

`cases.validators.ts:16`:

```ts
const listingTypeSchema = z.enum(['found', 'lost']);
```

`cases.ordering.ts:27-30`: reemplazar el comentario de tres lineas sobre `at_risk` y la firma por:

```ts
// lost: mas reciente primero. found: urgencia, despues menos voluntarios.
export function buildFeedOrderBy(listingType?: 'found' | 'lost'): string {
```

`cases.zone-stats.ts:58`: cambiar `c.listing_type IN ('found', 'at_risk')` por `c.listing_type = 'found'`, y borrar el comentario de `:38` que explicaba el plegado.

- [ ] **Step 4: Sacarlo del front**

`apps/web/src/types/case.ts:8`:

```ts
export type ListingType = 'found' | 'lost'
```

`apps/web/src/lib/listingType.ts`: borrar la entrada `at_risk` completa (lineas 35 en adelante hasta cerrar su objeto). El `Record<ListingType, ListingTypeStyle>` hace que sobre o falte una clave sea error de compilacion, asi que el typecheck confirma que quedo bien.

`apps/web/src/components/cases/HomeFeed.tsx:33`: `type Tab = 'all' | 'found' | 'lost'`, y borrar `{ id: 'at_risk', label: 'En riesgo' }` de la lista de tabs.

`apps/web/src/pages/PublishCasePage.tsx:49`: borrar la linea `at_risk:` de `TITULO_POR_TIPO`.

`apps/web/src/pages/PublishCasePage.tsx:426`: borrar el boton entero de `at_risk` del paso 0 (el `onClick={() => onSelect('at_risk')}` y su tarjeta). En la tarjeta que queda de `found`, cambiar el texto a **"Me crucé con un animal"** y la bajada a **"Lo encontraste, lo viste en la calle o está en riesgo. Después nos decís si te lo llevaste."**

- [ ] **Step 5: Correr todo y verificar que pasa**

Run: `pnpm --filter api test && pnpm --filter web test`
Expected: PASS
Run: `pnpm --filter api typecheck && pnpm --filter web typecheck`
Expected: sin errores. Si el typecheck marca un `at_risk` que quedo suelto, arreglalo — para eso esta el `Record` exhaustivo.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/modules/rescue/cases/ apps/web/src/types/case.ts apps/web/src/lib/listingType.ts apps/web/src/lib/listingType.test.ts apps/web/src/components/cases/HomeFeed.tsx apps/web/src/pages/PublishCasePage.tsx
git commit -m "refactor: retirar at_risk, que mezclaba el estado del animal con el tipo de publicacion"
```

---

### Task 4: El catalogo de paradero en el front

**Files:**
- Create: `apps/web/src/lib/whereabouts.ts`
- Create: `apps/web/src/lib/whereabouts.test.ts`
- Modify: `apps/web/src/types/case.ts`

**Interfaces:**
- Consumes: nada.
- Produces: `type Whereabouts`; `WHEREABOUTS_LABEL: Record<Whereabouts, string>`; `WHEREABOUTS_PIN: Record<Whereabouts, string>`; `isSheltered(w: Whereabouts): boolean`; `deriveWhereabouts(listingType: ListingType, chosen: Whereabouts): Whereabouts`. Lo usan las tasks 5, 8 y 9.

**Contexto:** este es el patron que fijo S2 — donde haya un mapa de valores de un enum va un `Record` tipado, nunca un ternario. Un ternario `w === 'en_la_calle' ? a : b` manda los tres valores restantes a la misma rama sin que el typecheck se entere; ese bug exacto ya hizo que `at_risk` se renderizara como "Encontre".

- [ ] **Step 1: Escribir el test que falla**

Crear `apps/web/src/lib/whereabouts.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { WHEREABOUTS_LABEL, WHEREABOUTS_PIN, isSheltered, deriveWhereabouts } from './whereabouts'
import type { Whereabouts } from '../types/case'

describe('whereabouts', () => {
  it('cubre exactamente los cuatro valores', () => {
    expect(Object.keys(WHEREABOUTS_LABEL).sort()).toEqual([
      'con_quien_publica', 'con_un_tercero', 'desconocido', 'en_la_calle',
    ])
    expect(Object.keys(WHEREABOUTS_PIN).sort()).toEqual(Object.keys(WHEREABOUTS_LABEL).sort())
  })

  it('a resguardo son exactamente los dos del medio', () => {
    const all: Whereabouts[] = ['en_la_calle', 'con_quien_publica', 'con_un_tercero', 'desconocido']
    expect(all.filter(isSheltered)).toEqual(['con_quien_publica', 'con_un_tercero'])
  })

  it('un animal buscado no cuenta como a resguardo', () => {
    // El caso que importa: 'desconocido' es la ausencia de dato, no una garantia.
    // Si cayera del lado de "a resguardo", los perros perdidos desaparecerian
    // del mapa por defecto, que es justo donde tienen que estar.
    expect(isSheltered('desconocido')).toBe(false)
  })
})

describe('deriveWhereabouts', () => {
  it('un animal buscado no tiene paradero conocido', () => {
    expect(deriveWhereabouts('lost', 'con_quien_publica')).toBe('desconocido')
  })

  it('en found respeta lo que eligio el usuario', () => {
    expect(deriveWhereabouts('found', 'con_un_tercero')).toBe('con_un_tercero')
  })

  it('en found sin eleccion, el animal quedo donde estaba', () => {
    expect(deriveWhereabouts('found', 'en_la_calle')).toBe('en_la_calle')
  })
})
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `pnpm --filter web test -- whereabouts`
Expected: FAIL — `./whereabouts` no existe.

- [ ] **Step 3: Agregar el tipo**

En `apps/web/src/types/case.ts`, junto a los otros tipos:

```ts
export type Whereabouts = 'en_la_calle' | 'con_quien_publica' | 'con_un_tercero' | 'desconocido'
```

Y agregar `whereabouts: Whereabouts` a la interfaz `CaseItem`.

- [ ] **Step 4: Escribir el catalogo**

Crear `apps/web/src/lib/whereabouts.ts`:

```ts
import type { Whereabouts } from '../types/case'

/**
 * Donde esta el animal ahora, que no es donde se lo vio.
 *
 * La ubicacion del caso siempre marca el avistamiento: el domicilio de quien
 * rescata no entra al sistema. Este catalogo es lo unico que traduce el enum a
 * pantalla; un Record exhaustivo convierte un valor nuevo en error de
 * compilacion, un objeto literal lo convierte en bug silencioso.
 */
export const WHEREABOUTS_LABEL: Record<Whereabouts, string> = {
  en_la_calle: 'Sigue donde lo vieron',
  con_quien_publica: 'A resguardo con quien publicó',
  con_un_tercero: 'A resguardo con otra persona',
  desconocido: 'Sin datos de dónde está',
}

/** Color del borde del pin en el mapa. El relleno lo sigue poniendo la urgencia. */
export const WHEREABOUTS_PIN: Record<Whereabouts, string> = {
  en_la_calle: '#f97316',
  con_quien_publica: '#22c55e',
  con_un_tercero: '#22c55e',
  desconocido: '#3b82f6',
}

/**
 * Si alguien lo tiene. Es la unica definicion de "a resguardo" del front.
 *
 * 'desconocido' NO cuenta: es la ausencia de dato, no una garantia. Un animal
 * perdido tiene que seguir apareciendo entre los que necesitan ayuda.
 */
export function isSheltered(w: Whereabouts): boolean {
  return w === 'con_quien_publica' || w === 'con_un_tercero'
}

/**
 * El paradero solo se le pregunta a quien se cruzo con un animal. Quien busca a
 * su mascota no sabe donde esta —esa es toda la historia—, asi que su respuesta
 * no se pide, y si llegara igual no se respeta.
 */
export function deriveWhereabouts(listingType: ListingType, chosen: Whereabouts): Whereabouts {
  return listingType === 'lost' ? 'desconocido' : chosen
}
```

El import del archivo necesita tambien `ListingType`:

```ts
import type { Whereabouts, ListingType } from '../types/case'
```

- [ ] **Step 5: Correr el test y verificar que pasa**

Run: `pnpm --filter web test -- whereabouts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
pnpm --filter web typecheck
git add apps/web/src/lib/whereabouts.ts apps/web/src/lib/whereabouts.test.ts apps/web/src/types/case.ts
git commit -m "feat(web): catalogo de paradero del animal"
```

---

### Task 5: El wizard pregunta el paradero

**Files:**
- Modify: `apps/web/src/pages/PublishCasePage.tsx`
- Modify: `apps/web/src/services/cases.service.ts`

**Interfaces:**
- Consumes: `Whereabouts`, `WHEREABOUTS_LABEL`, `deriveWhereabouts` (Task 4); el API acepta `whereabouts` y `hostName` (Task 1 y 2).
- Produces: `WizardState` incluye `whereabouts: Whereabouts` y `hostName: string`.

**Regla:** la pregunta aparece **solo** cuando `listingType === 'found'`. En `lost` no se muestra y se manda `desconocido`. La regla ya esta escrita y testeada en `deriveWhereabouts` (Task 4); esta task solo la usa.

- [ ] **Step 1: Sumar el estado y la UI**

En `WizardState` agregar:

```tsx
  whereabouts: Whereabouts
  hostName: string
```

En el `useState` inicial: `whereabouts: 'en_la_calle',` y `hostName: '',`.

En el paso de Descripcion (`step === 2`), y solo si `state.listingType === 'found'`, agregar el bloque:

```tsx
{state.listingType === 'found' && (
  <div className="flex flex-col gap-2">
    <label className="text-sm font-medium text-gray-700 dark:text-gray-200">
      ¿Dónde está el animal ahora?
    </label>
    <div className="flex flex-col gap-2">
      {(['en_la_calle', 'con_quien_publica', 'con_un_tercero'] as const).map((w) => (
        <button
          key={w}
          type="button"
          onClick={() => update('whereabouts', w)}
          className={`text-left px-3 py-2.5 rounded-lg border text-sm transition-colors ${
            state.whereabouts === w
              ? 'border-primary-600 bg-primary-50 dark:bg-primary-900/30 text-primary-800 dark:text-primary-200'
              : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
          }`}
        >
          {WHEREABOUTS_LABEL[w]}
        </button>
      ))}
    </div>
    {state.whereabouts === 'con_un_tercero' && (
      <Input
        label="¿Quién lo tiene?"
        placeholder="Nombre de quien lo aloja"
        value={state.hostName}
        onChange={(e) => update('hostName', e.target.value)}
      />
    )}
    <p className="text-xs text-gray-500 dark:text-gray-400">
      El mapa siempre marca dónde lo viste, nunca dónde vivís.
    </p>
  </div>
)}
```

Importar `WHEREABOUTS_LABEL` y `deriveWhereabouts` de `../lib/whereabouts`, y el tipo `Whereabouts` de `../types/case`.

- [ ] **Step 2: Mandarlo al API**

En el submit del wizard (`PublishCasePage.tsx:193-214`), agregar al payload:

```tsx
        whereabouts: deriveWhereabouts(state.listingType, state.whereabouts),
        hostName: state.whereabouts === 'con_un_tercero' && state.hostName.trim()
          ? state.hostName.trim()
          : undefined,
```

En `apps/web/src/services/cases.service.ts`, agregar `whereabouts` y `hostName?` al tipo del payload de creacion.

- [ ] **Step 3: Correr todo y commitear**

```bash
pnpm --filter web typecheck && pnpm --filter web test
git add apps/web/src/pages/PublishCasePage.tsx apps/web/src/services/cases.service.ts
git commit -m "feat(web): el wizard pregunta donde quedo el animal"
```

---

### Task 6: `geocoding.ts` — las queries acotadas a la localidad

**Files:**
- Create: `apps/web/src/lib/geocoding.ts`
- Create: `apps/web/src/lib/geocoding.test.ts`

**Interfaces:**
- Consumes: nada.
- Produces:
  - `interface Localidad { name: string; lat: number; lng: number; bbox: BBox }`
  - `type BBox = [south: number, north: number, west: number, east: number]` (el orden que devuelve Nominatim en `boundingbox`)
  - `parseLocalidad(raw: NominatimRaw): Localidad | null`
  - `buildLocalidadUrl(q: string): string`
  - `buildCalleUrl(calle: string, loc: Localidad): string`
  - `buildDireccionUrl(calle: string, numero: string, loc: Localidad): string`
  - `isInsideBBox(lat: number, lng: number, bbox: BBox): boolean`

**Contexto — por que existe este modulo:** hoy las queries se arman inline dentro de `StepUbicacion` y mandan la localidad como texto suelto. Medido contra Nominatim: `"Avenida Alem 850, Salto, Argentina"` devuelve una casa en **Almafuerte, Cordoba**, a 600 km. Con `limit=1` el wizard planta el pin ahi sin chistar. Acotar por `viewbox` + `bounded=1` lo vuelve imposible por construccion.

- [ ] **Step 1: Escribir el test que falla**

Crear `apps/web/src/lib/geocoding.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import {
  parseLocalidad, buildLocalidadUrl, buildCalleUrl, buildDireccionUrl, isInsideBBox,
} from './geocoding'
import type { Localidad } from './geocoding'

const pehuajo: Localidad = {
  name: 'Pehuajó',
  lat: -35.8104933,
  lng: -61.899055,
  bbox: [-35.85, -35.77, -61.95, -61.85],
}

describe('parseLocalidad', () => {
  it('se queda con las coordenadas y la caja que Nominatim ya devolvio', () => {
    const loc = parseLocalidad({
      name: 'Pehuajó',
      display_name: 'Pehuajó, Partido de Pehuajó, Buenos Aires, Argentina',
      lat: '-35.8104933',
      lon: '-61.8990550',
      boundingbox: ['-35.85', '-35.77', '-61.95', '-61.85'],
    })
    expect(loc?.name).toBe('Pehuajó')
    expect(loc?.bbox).toEqual([-35.85, -35.77, -61.95, -61.85])
  })

  it('descarta un resultado sin boundingbox en vez de inventarlo', () => {
    // Sin caja no hay ancla, y sin ancla la busqueda de calle vuelve a poder
    // aterrizar en otra provincia. Preferimos no ofrecer esa localidad.
    expect(parseLocalidad({
      name: 'X', display_name: 'X', lat: '-35', lon: '-61',
    })).toBeNull()
  })
})

describe('buildCalleUrl', () => {
  it('acota la busqueda a la caja de la localidad', () => {
    const url = buildCalleUrl('San Martin', pehuajo)
    expect(url).toContain('bounded=1')
    expect(url).toContain('viewbox=-61.95%2C-35.85%2C-61.85%2C-35.77')
  })

  it('no manda el nombre de la localidad dentro del texto buscado', () => {
    // Esa era la causa raiz: como texto, Nominatim la ignora si encuentra un
    // match mejor en otra provincia.
    const url = buildCalleUrl('San Martin', pehuajo)
    expect(url).not.toContain('Pehuaj')
  })
})

describe('buildDireccionUrl', () => {
  it('incluye el numero cuando lo hay', () => {
    expect(buildDireccionUrl('Alem', '850', pehuajo)).toContain('Alem%20850')
  })

  it('sin numero busca la calle sola y no rompe', () => {
    const url = buildDireccionUrl('Alem', '', pehuajo)
    expect(url).toContain('q=Alem')
    expect(url).not.toContain('undefined')
    expect(url).toContain('bounded=1')
  })

  it('un numero con espacios de sobra no ensucia la query', () => {
    expect(buildDireccionUrl('Alem', '  850  ', pehuajo)).toContain('Alem%20850')
  })
})

describe('isInsideBBox', () => {
  it('acepta un punto de la localidad', () => {
    expect(isInsideBBox(-35.81, -61.89, pehuajo.bbox)).toBe(true)
  })

  it('rechaza el resultado de otra provincia', () => {
    // Almafuerte, Cordoba: el lugar exacto al que iba a parar el pin.
    expect(isInsideBBox(-32.19, -64.26, pehuajo.bbox)).toBe(false)
  })
})
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `pnpm --filter web test -- geocoding`
Expected: FAIL — el modulo no existe.

- [ ] **Step 3: Escribir el modulo**

Crear `apps/web/src/lib/geocoding.ts`:

```ts
/**
 * Consultas a Nominatim ancladas a una localidad.
 *
 * El bug que este modulo existe para matar: mandar la localidad como texto
 * dentro del query. Nominatim la trata como sugerencia y la ignora si encuentra
 * un match mejor en otra parte. Medido: "Avenida Alem 850, Salto, Argentina"
 * devuelve una casa en Almafuerte, Cordoba, a 600 km — y el wizard pedia
 * limit=1 y plantaba el pin ahi.
 *
 * La localidad se elige una vez de una lista y de ahi sale su boundingbox. Todo
 * lo que sigue va con viewbox + bounded=1, asi que el resultado no puede caer
 * afuera. Es una restriccion del servidor, no una validacion nuestra.
 */

const BASE = 'https://nominatim.openstreetmap.org/search'

/** El orden que usa Nominatim en `boundingbox`: sur, norte, oeste, este. */
export type BBox = [south: number, north: number, west: number, east: number]

export interface Localidad {
  name: string
  lat: number
  lng: number
  bbox: BBox
}

export interface NominatimRaw {
  name?: string
  display_name: string
  lat: string
  lon: string
  boundingbox?: string[]
}

/** `viewbox` va en orden oeste,sur,este,norte — distinto del de `boundingbox`. */
function viewboxParam(bbox: BBox): string {
  const [south, north, west, east] = bbox
  return `${west},${south},${east},${north}`
}

export function parseLocalidad(raw: NominatimRaw): Localidad | null {
  if (!raw.boundingbox || raw.boundingbox.length !== 4) return null
  const bbox = raw.boundingbox.map(Number) as BBox
  if (bbox.some(Number.isNaN)) return null
  return {
    name: raw.name || raw.display_name.split(',')[0].trim(),
    lat: parseFloat(raw.lat),
    lng: parseFloat(raw.lon),
    bbox,
  }
}

export function buildLocalidadUrl(q: string): string {
  const params = new URLSearchParams({
    format: 'json',
    q: q.trim(),
    countrycodes: 'ar',
    limit: '5',
  })
  return `${BASE}?${params}`
}

function buildBoundedUrl(q: string, loc: Localidad, limit: number): string {
  const params = new URLSearchParams({
    format: 'json',
    q,
    countrycodes: 'ar',
    viewbox: viewboxParam(loc.bbox),
    bounded: '1',
    limit: String(limit),
  })
  return `${BASE}?${params}`
}

export function buildCalleUrl(calle: string, loc: Localidad): string {
  return buildBoundedUrl(calle.trim(), loc, 8)
}

/**
 * El numero es una pista, no un requisito: en los pueblos del interior OSM casi
 * no tiene numeros de casa. Si falta o no existe, la busqueda cae sola a la
 * calle y el usuario termina de ubicar el pin arrastrandolo.
 */
export function buildDireccionUrl(calle: string, numero: string, loc: Localidad): string {
  const n = numero.trim()
  const q = n ? `${calle.trim()} ${n}` : calle.trim()
  return buildBoundedUrl(q, loc, 1)
}

export function isInsideBBox(lat: number, lng: number, bbox: BBox): boolean {
  const [south, north, west, east] = bbox
  return lat >= south && lat <= north && lng >= west && lng <= east
}
```

- [ ] **Step 4: Correr el test y verificar que pasa**

Run: `pnpm --filter web test -- geocoding`
Expected: PASS (10 tests)

- [ ] **Step 5: Commit**

```bash
pnpm --filter web typecheck
git add apps/web/src/lib/geocoding.ts apps/web/src/lib/geocoding.test.ts
git commit -m "feat(web): queries de geocodificacion ancladas al boundingbox de la localidad"
```

---

### Task 7: Los autocompletes usan el ancla

**Files:**
- Modify: `apps/web/src/components/cases/LocalidadAutocomplete.tsx`
- Modify: `apps/web/src/components/cases/CalleAutocomplete.tsx`
- Test: `apps/web/src/components/cases/LocalidadAutocomplete.test.tsx` (crear)

**Interfaces:**
- Consumes: `parseLocalidad`, `buildLocalidadUrl`, `buildCalleUrl`, `Localidad` (Task 6).
- Produces:
  - `LocalidadAutocomplete` con prop `onSelect: (loc: Localidad) => void` (obligatoria, ya no opcional).
  - `CalleAutocomplete` con prop `localidad: Localidad | null` en vez de `localidad: string`; deshabilitado mientras sea `null`.

- [ ] **Step 1: Escribir el test que falla**

Crear `apps/web/src/components/cases/LocalidadAutocomplete.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import LocalidadAutocomplete from './LocalidadAutocomplete'

const RESULT = {
  name: 'Pehuajó',
  display_name: 'Pehuajó, Partido de Pehuajó, Buenos Aires, Argentina',
  lat: '-35.8104933',
  lon: '-61.8990550',
  boundingbox: ['-35.85', '-35.77', '-61.95', '-61.85'],
}

describe('LocalidadAutocomplete', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve([RESULT]) }),
    ))
  })

  it('entrega la caja junto con el nombre al elegir', async () => {
    const onSelect = vi.fn()
    render(<LocalidadAutocomplete value="" onChange={() => {}} onSelect={onSelect} />)

    await userEvent.type(screen.getByRole('textbox'), 'Pehuajo')
    const opcion = await screen.findByRole('button', { name: /Pehuajó/ })
    await userEvent.click(opcion)

    expect(onSelect).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Pehuajó', bbox: [-35.85, -35.77, -61.95, -61.85] }),
    )
  })

  it('no dispara un fetch por cada tecla', async () => {
    // La causa por la que el desplegable quedaba vacio: Nominatim corta por
    // cuota y el catch dejaba la lista en cero, sin decir nada.
    render(<LocalidadAutocomplete value="" onChange={() => {}} onSelect={() => {}} />)
    await userEvent.type(screen.getByRole('textbox'), 'Pehuajo')
    await waitFor(() => expect(fetch).toHaveBeenCalled())
    expect((fetch as ReturnType<typeof vi.fn>).mock.calls.length).toBeLessThanOrEqual(2)
  })
})
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `pnpm --filter web test -- LocalidadAutocomplete`
Expected: FAIL — hoy `onSelect` recibe `(name, lat, lng)`, sin caja.

- [ ] **Step 3: Cambiar `LocalidadAutocomplete`**

- Cambiar la prop: `onSelect: (loc: Localidad) => void`.
- Reemplazar el armado de la URL por `buildLocalidadUrl(q)` y **borrar `featuretype=city`** del query viejo: no aporta y el modulo nuevo ya no lo manda.
- En la respuesta, mapear con `parseLocalidad` y descartar los `null`:

```tsx
        const data: NominatimRaw[] = await res.json()
        const parsed = data.map(parseLocalidad).filter((l): l is Localidad => l !== null)
        setSuggestions(parsed)
        setOpen(parsed.length > 0)
```

- En `handleSelect(loc: Localidad)`: `onChange(loc.name)` y `onSelect(loc)`.
- Mantener el debounce de 400ms que ya tiene.

- [ ] **Step 4: Cambiar `CalleAutocomplete`**

- Cambiar la prop a `localidad: Localidad | null`.
- En `search`, salir temprano si `!localidad`, y usar `buildCalleUrl(q, localidad)`.
- Borrar el armado manual de `` `${q}, ${localidad}, Argentina` `` — es exactamente el patron que hacia aterrizar el pin en otra provincia.
- Agregar `disabled={!localidad}` al input y, cuando sea `null`, el placeholder `"Elegí primero la localidad"`.
- El `useCallback` de `search` depende ahora de `localidad` (el objeto); dejalo en el array de dependencias.

- [ ] **Step 5: Correr el test y verificar que pasa**

Run: `pnpm --filter web test -- LocalidadAutocomplete`
Expected: PASS

- [ ] **Step 6: Commit**

El typecheck va a marcar los usos viejos en `PublishCasePage.tsx` y `FilterBar.tsx`. **No los arregles todavia** — `PublishCasePage` es la Task 8. Para `FilterBar.tsx`, que usa su propia busqueda de localidad inline y no estos componentes, verifica con `grep -n "LocalidadAutocomplete\|CalleAutocomplete" apps/web/src/components/cases/FilterBar.tsx`; si no aparecen, no lo toques.

```bash
pnpm --filter web test -- LocalidadAutocomplete CalleAutocomplete
git add apps/web/src/components/cases/LocalidadAutocomplete.tsx apps/web/src/components/cases/CalleAutocomplete.tsx apps/web/src/components/cases/LocalidadAutocomplete.test.tsx
git commit -m "feat(web): los autocompletes se anclan a la localidad elegida"
```

---

### Task 8: El paso de ubicacion del wizard

**Files:**
- Modify: `apps/web/src/pages/PublishCasePage.tsx:590-900` (`StepUbicacion`, `AddressMode`, `OverpassResponse`, `queryOverpass`)

**Interfaces:**
- Consumes: `Localidad`, `buildDireccionUrl`, `isInsideBBox` (Task 6); los autocompletes nuevos (Task 7).
- Produces: nada que consuman otras tasks.

**Que se retira, con su motivo:**
- `queryOverpass`, `OverpassResponse`, `AddressMode` y todo el modo Interseccion. El mirror de Overpass ya era inestable y con calle + mapa la interseccion se resuelve arrastrando el pin dos cuadras. El "entre Sarmiento y Rivadavia" va a `referenceNote`, que ya existe y es texto para humanos.
- El boton "Buscar direccion": ahora resuelve al elegir.
- El `useEffect` de `localidad` (`:662`) que geocodificaba el string en cada tecla. La localidad ya trae sus coordenadas.

- [ ] **Step 1: Reemplazar el estado del paso**

En `StepUbicacion`, cambiar:

```tsx
  const [localidad, setLocalidad] = useState('')
  const [addressMode, setAddressMode] = useState<AddressMode>('numero')
  const [calle2, setCalle2] = useState('')
  const [localidadCenter, setLocalidadCenter] = useState<[number, number] | null>(null)
```

por:

```tsx
  const [localidadText, setLocalidadText] = useState('')
  const [localidad, setLocalidad] = useState<Localidad | null>(null)
```

Borrar `calle2`, `addressMode` y `localidadCenter` de todo el componente.

- [ ] **Step 2: Borrar el `useEffect` de geocodificacion por tecla**

Borrar entero el `useEffect` de las lineas ~662-675 (el que hace `fetch` a Nominatim con `localidad.trim() + ', Argentina'`). Ya no hace falta: la localidad llega con sus coordenadas desde el autocomplete.

- [ ] **Step 3: Borrar Overpass**

Borrar del archivo: `type AddressMode`, `interface OverpassResponse`, la funcion `queryOverpass` completa con su comentario, y toda la rama `if (addressMode === 'interseccion')` de `handleGeocode`. Borrar tambien el bloque JSX del selector Calle-y-numero / Interseccion y el `else` con los dos `CalleAutocomplete`.

- [ ] **Step 4: Reescribir la resolucion de direccion**

Reemplazar `handleGeocode` por una resolucion automatica que corre cuando cambian calle o numero y ya hay localidad:

```tsx
  // Resuelve sola: el usuario no tiene que apretar nada. El numero es una pista
  // y su ausencia nunca es un error — en el interior OSM casi no tiene numeros
  // de casa, asi que caer a la calle es el caso normal, no el degradado.
  useEffect(() => {
    if (!localidad || !calle.trim()) return
    const controller = new AbortController()
    const t = setTimeout(async () => {
      setGeocoding(true)
      try {
        const res = await fetch(buildDireccionUrl(calle, numero, localidad), {
          headers: { 'Accept-Language': 'es' },
          signal: controller.signal,
        })
        if (!res.ok) return
        const data: Array<{ lat: string; lon: string }> = await res.json()
        if (!data.length) return
        const hitLat = parseFloat(data[0].lat)
        const hitLng = parseFloat(data[0].lon)
        // bounded=1 ya lo garantiza del lado del server; el chequeo es el cinturon
        // por si Nominatim cambia de opinion sobre que significa acotado.
        if (!isInsideBBox(hitLat, hitLng, localidad.bbox)) return
        onLatChange(hitLat)
        onLngChange(hitLng)
        onLocationTextChange(
          numero.trim()
            ? `${calle.trim()} ${numero.trim()}, ${localidad.name}`
            : `${calle.trim()}, ${localidad.name}`,
        )
      } catch {
        // Silencio a proposito: el pin ya esta en la localidad y se arrastra.
      } finally {
        setGeocoding(false)
      }
    }, 500)
    return () => { clearTimeout(t); controller.abort() }
  }, [calle, numero, localidad])
```

Borrar el estado `geocodeError` y su `<p>`: ya no hay caminos sin salida.

- [ ] **Step 5: Que el pin exista siempre**

Cuando se elige la localidad, plantar el pin en su centro:

```tsx
          <LocalidadAutocomplete
            value={localidadText}
            onChange={setLocalidadText}
            onSelect={(loc) => {
              setLocalidad(loc)
              setLocalidadText(loc.name)
              // El pin arranca en el centro de la localidad. Nunca hay un estado
              // sin mapa: peor caso, el usuario lo arrastra hasta la cuadra.
              if (lat === null) { onLatChange(loc.lat); onLngChange(loc.lng) }
            }}
          />
```

En el bloque del mapa al final del componente, reemplazar `lat ?? localidadCenter?.[0] ?? null` por `lat` y lo mismo para `lng` — ahora `lat` siempre tiene valor una vez elegida la localidad.

- [ ] **Step 6: El copy nuevo**

- El `<Input label="Número">` pasa a `label="Número (opcional)"`.
- Debajo de la fila de calle y numero, agregar:

```tsx
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Marcá la cuadra, no hace falta que sea exacto. Después ajustá el pin en el mapa.
        </p>
```

- El separador del mapa: cambiar el texto de `'o tocá el mapa para marcar la ubicación'` por `'arrastrá el pin hasta donde lo viste'`.

- [ ] **Step 7: Ajustar el reverse geocoding**

En `handleMapChange`, la parte que escribe en el formulario: `setLocalidad(city)` ya no compila porque `localidad` es un objeto. Cambiar para que solo actualice el texto visible y **no** pise el ancla:

```tsx
          if (road) setCalle(road)
          if (num) setNumero(num)
          // La localidad NO se pisa: el ancla la eligio el usuario de una lista
          // y su bbox es lo que mantiene acotadas las busquedas de calle.
```

Borrar el `setAddressMode('numero')` que acompañaba a `setNumero`.

- [ ] **Step 8: Typecheck, tests y verificacion manual**

```bash
pnpm --filter web typecheck && pnpm --filter web test
```
Expected: sin errores, todos los tests pasan.

Verificacion a mano, con `pnpm --filter web dev`, en `/cases/new`:
1. Elegir "Me crucé con un animal", llegar al paso Ubicación.
2. Escribir "Pehuajo" y elegirlo de la lista. **El mapa tiene que aparecer con el pin en Pehuajó.**
3. Escribir "San Martin" en Calle, sin numero. El pin se mueve a la calle, **sin apretar nada**.
4. Escribir "1234" en Número. El pin no se va de la localidad ni aparece ningun error.
5. Arrastrar el pin. La calle y el numero se completan solos; **la localidad no cambia**.

- [ ] **Step 9: Commit**

```bash
git add apps/web/src/pages/PublishCasePage.tsx
git commit -m "feat(web): la direccion se resuelve dentro de la localidad elegida"
```

---

### Task 9: El mapa distingue quien necesita ayuda

**Files:**
- Modify: `apps/web/src/components/map/LeafletMap.tsx:20-35`
- Modify: `apps/web/src/components/cases/FilterBar.tsx`
- Modify: `apps/web/src/pages/CasesPage.tsx`
- Modify: `apps/web/src/services/cases.service.ts`
- Test: `apps/web/src/components/map/LeafletMap.test.tsx` (crear)

**Interfaces:**
- Consumes: `WHEREABOUTS_PIN`, `isSheltered` (Task 4); el filtro `sheltered` del API (Task 1 y 2).
- Produces: nada.

- [ ] **Step 1: Escribir el test que falla**

Crear `apps/web/src/components/map/LeafletMap.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest'
import { pinBorderColor } from './LeafletMap'

describe('pinBorderColor', () => {
  it('un animal a resguardo se distingue de uno en la calle', () => {
    expect(pinBorderColor('con_quien_publica', false))
      .not.toBe(pinBorderColor('en_la_calle', false))
  })

  it('el caso propio gana sobre el paradero', () => {
    // Reconocer los casos de uno mismo es mas util que su paradero: ya sabes
    // donde esta tu animal.
    expect(pinBorderColor('en_la_calle', true)).toBe('#7c3aed')
  })
})
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `pnpm --filter web test -- LeafletMap`
Expected: FAIL — `pinBorderColor` no existe.

- [ ] **Step 3: Cambiar el pin**

En `LeafletMap.tsx`, agregar y exportar:

```tsx
/**
 * El borde del pin codifica el paradero; el relleno lo sigue poniendo la
 * urgencia. Antes el borde decia el tipo de publicacion, que era el dato menos
 * accionable de los tres.
 */
export function pinBorderColor(whereabouts: Whereabouts, isOwn: boolean): string {
  return isOwn ? '#7c3aed' : WHEREABOUTS_PIN[whereabouts]
}
```

En `makeCaseIcon`, reemplazar:

```tsx
  const typeColor = LISTING_TYPE[c.listingType].pinColor
  const border = isOwn ? '3px solid #7c3aed' : `3px solid ${typeColor}`
```

por:

```tsx
  const border = `3px solid ${pinBorderColor(c.whereabouts, isOwn)}`
```

Importar `WHEREABOUTS_PIN` de `../../lib/whereabouts` y el tipo `Whereabouts`. Si `LISTING_TYPE` queda sin uso en el archivo, borrar su import.

- [ ] **Step 4: Correr el test y verificar que pasa**

Run: `pnpm --filter web test -- LeafletMap`
Expected: PASS

- [ ] **Step 5: El toggle en `FilterBar`**

Agregar la prop `showSheltered: boolean` y `onShowShelteredChange: (v: boolean) => void`, y el control:

```tsx
<label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
  <input
    type="checkbox"
    checked={showSheltered}
    onChange={(e) => onShowShelteredChange(e.target.checked)}
    className="rounded border-gray-300 dark:border-gray-600"
  />
  Mostrar los que ya están a resguardo
</label>
```

- [ ] **Step 6: Cablearlo a la query**

En `CasesPage.tsx`, sumar `showSheltered` al estado de filtros con valor inicial `false` y pasarlo al servicio.

En `cases.service.ts`, en la funcion de listado: mandar `sheltered: 'false'` cuando `showSheltered` sea `false`, y **omitir el parametro** cuando sea `true` (sin filtro = todos, que es lo que espera el schema de la Task 1).

- [ ] **Step 7: Verificacion manual**

Con `pnpm --filter web dev`, en `/cases`:
1. Publicar un caso con "Me lo llevé".
2. El pin **no** aparece en el mapa por defecto.
3. Tildar "Mostrar los que ya están a resguardo": el pin aparece, con borde verde.
4. El pin esta **en el lugar del hallazgo**, no en otro lado.

- [ ] **Step 8: Commit**

```bash
pnpm --filter web typecheck && pnpm --filter web test
git add apps/web/src/components/map/LeafletMap.tsx apps/web/src/components/map/LeafletMap.test.tsx apps/web/src/components/cases/FilterBar.tsx apps/web/src/pages/CasesPage.tsx apps/web/src/services/cases.service.ts
git commit -m "feat(web): el mapa esconde por defecto a los animales ya a resguardo"
```

---

### Task 10: Mostrar el paradero en la ficha

**Files:**
- Modify: `apps/web/src/pages/CasePage.tsx`
- Modify: `apps/web/src/components/cases/CaseDetailSheet.tsx`

**Interfaces:**
- Consumes: `WHEREABOUTS_LABEL` (Task 4).
- Produces: nada.

- [ ] **Step 1: Agregar la fila en la ficha**

En el bloque de pares clave-valor de `CasePage.tsx` (donde ya salen especie, estado y tamaño), agregar una fila `Dónde está` con `WHEREABOUTS_LABEL[caseItem.whereabouts]`.

Ubicarla **inmediatamente despues** de la fila de ubicacion, para que se lea "lo vieron en X / ahora está Y" de corrido.

- [ ] **Step 2: Aclarar que la ubicacion es del avistamiento**

Cambiar la etiqueta de la fila de ubicacion de `Ubicación` a `Dónde lo vieron`. Es el cambio de significado del spec hecho visible: el mapa nunca dice donde vive nadie.

Hacer el mismo cambio en `CaseDetailSheet.tsx` (el panel del mapa).

- [ ] **Step 3: Verificacion manual**

Abrir un caso a resguardo y uno en la calle; las dos filas tienen que leerse coherentes.

- [ ] **Step 4: Commit**

```bash
pnpm --filter web typecheck && pnpm --filter web test
git add apps/web/src/pages/CasePage.tsx apps/web/src/components/cases/CaseDetailSheet.tsx
git commit -m "feat(web): la ficha distingue donde lo vieron de donde esta"
```

---

### Task 11: Migration B — cerrar la CHECK (SOLO despues del deploy)

**Files:**
- Create: `apps/api/src/db/migrations/20260821000000-retire-at-risk.js`

**Interfaces:**
- Consumes: que las tasks 1-10 esten mergeadas **y desplegadas y verificadas en produccion**.
- Produces: nada.

**PARAR ANTES DE EMPEZAR.** Esta task no va en el mismo PR que las anteriores. Dev y prod comparten la base de Supabase: si la CHECK se cierra mientras alguien tiene cargado el bundle viejo, esa persona elige "Vi un animal en riesgo" y se come un 500 al publicar. Correr esta migration recien cuando:

1. El PR con las tasks 1-10 este mergeado.
2. Render haya terminado de deployar el API.
3. La web nueva este sirviendose (ojo: la primera carga despues de un deploy trae el build viejo por el service worker — recargar dos veces).
4. `SELECT count(*) FROM cases WHERE listing_type = 'at_risk';` devuelva 0.

- [ ] **Step 1: Verificar que no haya casos `at_risk`**

```sql
SELECT count(*) FROM cases WHERE listing_type = 'at_risk';
```
Expected: 0. **Si devuelve mas de 0, parar** y decidir a que tipo se migran antes de seguir.

- [ ] **Step 2: Escribir la migration**

Crear `apps/api/src/db/migrations/20260821000000-retire-at-risk.js`:

```js
'use strict';

/**
 * Retira 'at_risk' de listing_type.
 *
 * Era el eje del estado del animal disfrazado de tipo de publicacion: un animal
 * en riesgo ya se describe con urgency_level y animal_condition. Lo que
 * 'at_risk' queria decir de verdad —que nadie lo levanto— ahora lo dice
 * whereabouts = 'en_la_calle'.
 *
 * Va separada de la migration que agrego whereabouts y se corre despues del
 * deploy: cerrar la CHECK mientras el bundle viejo sigue ofreciendo el tipo le
 * da un 500 a quien lo elija.
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const q = (sql) => queryInterface.sequelize.query(sql);

    // Red de seguridad: si entro alguno entre el deploy y esta migration, cae
    // en found + en_la_calle, que es lo que at_risk significaba.
    await q(`
      UPDATE cases
      SET listing_type = 'found', whereabouts = 'en_la_calle'
      WHERE listing_type = 'at_risk';
    `);

    await q(`ALTER TABLE cases DROP CONSTRAINT cases_listing_type_check;`);
    await q(`
      ALTER TABLE cases
        ADD CONSTRAINT cases_listing_type_check
          CHECK (listing_type IN ('found','lost'));
    `);
  },

  async down(queryInterface) {
    const q = (sql) => queryInterface.sequelize.query(sql);
    await q(`ALTER TABLE cases DROP CONSTRAINT cases_listing_type_check;`);
    await q(`
      ALTER TABLE cases
        ADD CONSTRAINT cases_listing_type_check
          CHECK (listing_type IN ('found','lost','at_risk'));
    `);
  },
};
```

- [ ] **Step 3: Correr y verificar**

Run: `pnpm --filter api migrate`

```sql
SELECT pg_get_constraintdef(oid) FROM pg_constraint WHERE conname = 'cases_listing_type_check';
```
Expected: la definicion menciona solo `'found'` y `'lost'`.

- [ ] **Step 4: Verificar que publicar sigue andando**

Publicar un caso de verdad desde produccion. Es la unica prueba que cuenta: la leccion del 20/08 fue que mirar la pantalla encuentra lo que ninguna review encuentra.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/db/migrations/20260821000000-retire-at-risk.js
git commit -m "chore(db): cerrar la CHECK de listing_type sin at_risk"
```
