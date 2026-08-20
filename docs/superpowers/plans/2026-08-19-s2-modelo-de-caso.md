# S2 — Modelo de caso ampliado: plan de implementacion

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** que el caso tenga titulo, codigo publico, estado del animal y fecha de avistamiento, que exista la especie Ave y el tercer tipo de publicacion "Vi un animal en riesgo".

**Architecture:** una sola migration agrega cuatro columnas, amplia dos CHECK y retira `condition`. El API expone las columnas nuevas por los SELECT que ya existen (`BASE_CASE_SELECT` mas tres listas explicitas). En web, el titulo pasa a ser encabezado en cuatro pantallas y el wizard gana los campos que lo alimentan. El titulo se sugiere con una funcion pura y se puede reescribir.

**Tech Stack:** Node 20 + TypeScript strict, Express, Sequelize (SQL crudo en `cases.service.ts`), Postgres 15 + PostGIS, Zod, React 18 + Vite + Tailwind, vitest (api y web).

**Spec:** `docs/superpowers/specs/2026-08-19-s2-modelo-de-caso-design.md`

## Global Constraints

- Codigo en ingles; comentarios y mensajes de commit en castellano. Sin emojis en los commits.
- Conventional Commits: `feat:`, `fix:`, `chore:`, `refactor:`, `docs:`, `test:`.
- Validacion Zod en todos los endpoints (body, query, params).
- Nunca SQL crudo por concatenacion: siempre `replacements` parametrizados.
- Los enums de Zod tienen un CHECK espejo en Postgres. Sumar un valor en Zod sin la migration devuelve 500 al publicar.
- No tocar `modules/community/`.
- Valores exactos del enum de estado: `herido`, `sano`, `asustado`, `debil`, `no_pude_acercarme`.
- Valor exacto del tercer tipo: `at_risk`. Valor exacto de la especie nueva: `ave`.
- Chips de "cuando lo viste", texto exacto de la maqueta: `Ahora mismo`, `Hace menos de 1 hora`, `Hoy mas temprano`, `Ayer`, `Otra fecha`.
- Rama de trabajo: `feat/s2-modelo-de-caso` (ya creada, con la spec commiteada).

---

### Task 1: Migration

**Files:**
- Create: `apps/api/src/db/migrations/20260819000000-case-model-s2.js`

**Interfaces:**
- Consumes: nada.
- Produces: las columnas `title`, `public_code`, `animal_condition`, `seen_at` en `cases`; los CHECK `cases_listing_type_check` y `cases_animal_type_check` ampliados; la columna `condition` ya no existe; la secuencia `cases_public_code_seq`.

**Contexto que el implementador necesita:**

Las migrations viven en `apps/api/src/db/migrations/` y corren con `pnpm --filter api migrate` (rollback: `pnpm --filter api migrate:undo`). El patron de la casa para cambiar un CHECK es `DROP CONSTRAINT` + `ADD CONSTRAINT` por SQL crudo, no `queryInterface.addConstraint` — ver `20260814000000-add-animal-types-to-cases.js`.

La base de dev es un proyecto Supabase remoto, no hay Postgres local. Por eso el SQL se prueba antes dentro de una transaccion con `ROLLBACK`, y recien despues se corre la migration de verdad.

- [ ] **Step 1: Escribir la migration**

```js
'use strict';

/**
 * S2 — modelo de caso ampliado.
 *
 * Cuatro columnas nuevas (titulo, codigo publico, estado del animal, cuando se
 * lo vio), dos CHECK ampliados (el tercer tipo de publicacion y la especie ave)
 * y el retiro de `condition`, cuyo texto libre se vuelca a la descripcion.
 *
 * El codigo publico lo genera Postgres por DEFAULT sobre una secuencia: si lo
 * calculara el servicio con un max+1, dos publicaciones simultaneas se llevarian
 * el mismo codigo.
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const q = (sql) => queryInterface.sequelize.query(sql);

    // --- titulo: nullable, se rellena, y recien despues NOT NULL ---
    await q(`ALTER TABLE cases ADD COLUMN title VARCHAR(120);`);
    await q(`
      UPDATE cases SET title = btrim(
        CASE animal_type
          WHEN 'perro'   THEN 'Perro'
          WHEN 'gato'    THEN 'Gato'
          WHEN 'caballo' THEN 'Caballo'
          WHEN 'vaca'    THEN 'Vaca'
          WHEN 'ave'     THEN 'Ave'
          ELSE 'Animal'
        END
        || COALESCE(' ' || animal_size, '')
      );
    `);
    await q(`ALTER TABLE cases ALTER COLUMN title SET NOT NULL;`);

    // --- codigo publico ---
    await q(`CREATE SEQUENCE cases_public_code_seq START 1000;`);
    await q(`ALTER TABLE cases ADD COLUMN public_code VARCHAR(12);`);
    await q(`UPDATE cases SET public_code = 'C-' || nextval('cases_public_code_seq');`);
    await q(`
      ALTER TABLE cases
        ALTER COLUMN public_code SET DEFAULT 'C-' || nextval('cases_public_code_seq');
    `);
    await q(`ALTER TABLE cases ALTER COLUMN public_code SET NOT NULL;`);
    await q(`ALTER TABLE cases ADD CONSTRAINT cases_public_code_key UNIQUE (public_code);`);
    // La secuencia muere con la columna: sin esto queda huerfana si alguien
    // dropea public_code sin pasar por el down().
    await q(`ALTER SEQUENCE cases_public_code_seq OWNED BY cases.public_code;`);

    // --- estado del animal ---
    await q(`ALTER TABLE cases ADD COLUMN animal_condition VARCHAR(20);`);
    await q(`
      ALTER TABLE cases
        ADD CONSTRAINT cases_animal_condition_check
          CHECK (animal_condition IN ('herido','sano','asustado','debil','no_pude_acercarme'));
    `);

    // --- cuando se lo vio ---
    await q(`ALTER TABLE cases ADD COLUMN seen_at TIMESTAMPTZ;`);
    await q(`UPDATE cases SET seen_at = created_at;`);

    // --- retiro de condition: el texto se anexa a la descripcion ---
    await q(`
      UPDATE cases
      SET description = description || E'\\n\\n' || condition
      WHERE condition IS NOT NULL AND btrim(condition) <> '';
    `);
    await q(`ALTER TABLE cases DROP COLUMN condition;`);

    // --- CHECKs ampliados ---
    await q(`ALTER TABLE cases DROP CONSTRAINT cases_listing_type_check;`);
    await q(`
      ALTER TABLE cases
        ADD CONSTRAINT cases_listing_type_check
          CHECK (listing_type IN ('found','lost','at_risk'));
    `);
    await q(`ALTER TABLE cases DROP CONSTRAINT cases_animal_type_check;`);
    await q(`
      ALTER TABLE cases
        ADD CONSTRAINT cases_animal_type_check
          CHECK (animal_type IN ('perro','gato','caballo','vaca','ave','otro'));
    `);
  },

  /**
   * Reversible salvo un detalle: el texto que se volco a la descripcion no se
   * vuelve a separar. La columna condition vuelve vacia.
   */
  async down(queryInterface) {
    const q = (sql) => queryInterface.sequelize.query(sql);

    await q(`UPDATE cases SET listing_type = 'found' WHERE listing_type = 'at_risk';`);
    await q(`ALTER TABLE cases DROP CONSTRAINT cases_listing_type_check;`);
    await q(`
      ALTER TABLE cases
        ADD CONSTRAINT cases_listing_type_check
          CHECK (listing_type IN ('found','lost'));
    `);

    await q(`UPDATE cases SET animal_type = 'otro' WHERE animal_type = 'ave';`);
    await q(`ALTER TABLE cases DROP CONSTRAINT cases_animal_type_check;`);
    await q(`
      ALTER TABLE cases
        ADD CONSTRAINT cases_animal_type_check
          CHECK (animal_type IN ('perro','gato','caballo','vaca','otro'));
    `);

    await q(`ALTER TABLE cases ADD COLUMN condition VARCHAR(100);`);
    await q(`ALTER TABLE cases DROP CONSTRAINT cases_animal_condition_check;`);
    await q(`ALTER TABLE cases DROP COLUMN animal_condition;`);
    await q(`ALTER TABLE cases DROP COLUMN seen_at;`);
    await q(`ALTER TABLE cases DROP COLUMN title;`);
    await q(`ALTER TABLE cases DROP CONSTRAINT cases_public_code_key;`);
    await q(`ALTER TABLE cases DROP COLUMN public_code;`);
    await q(`DROP SEQUENCE IF EXISTS cases_public_code_seq;`);
  },
};
```

- [ ] **Step 2: Probar el SQL con ROLLBACK antes de correrlo**

Ejecutar el bloque del `up()` dentro de una transaccion abortada, para ver que
no revienta contra los datos reales sin dejar rastro. Usar el MCP de Supabase
(`mcp__supabase__execute_sql`) con el SQL del `up()` envuelto asi:

```sql
BEGIN;
-- ... aca el SQL del up(), en orden ...
-- comprobaciones antes de deshacer:
SELECT count(*) AS sin_titulo FROM cases WHERE title IS NULL;
SELECT count(*) AS sin_codigo FROM cases WHERE public_code IS NULL;
SELECT count(DISTINCT public_code) AS codigos, count(*) AS filas FROM cases;
SELECT title, public_code, seen_at FROM cases ORDER BY created_at LIMIT 5;
ROLLBACK;
```

Esperado: `sin_titulo = 0`, `sin_codigo = 0`, `codigos = filas`, y los cinco
titulos de muestra con forma "Perro mediano" / "Gato".

Si algo falla, corregir la migration y repetir. El `ROLLBACK` garantiza que la
base queda como estaba.

- [ ] **Step 3: Correr la migration**

```bash
pnpm --filter api migrate
```

Esperado: la migration aparece como aplicada, sin error.

- [ ] **Step 4: Verificar el rollback y volver a aplicar**

```bash
pnpm --filter api migrate:undo
pnpm --filter api migrate
```

Esperado: las dos corren limpias. Esto prueba el `down()`, que de otro modo no
se ejercita nunca.

- [ ] **Step 5: Revisar los grants de la secuencia**

Supabase abre los objetos nuevos al rol `anon`. La tabla `cases` ya se reviso en
su momento, pero la secuencia es un objeto nuevo:

```sql
SELECT grantee, privilege_type
FROM information_schema.role_usage_grants
WHERE object_name = 'cases_public_code_seq';
```

Si aparece `anon`, revocarlo:

```sql
REVOKE ALL ON SEQUENCE cases_public_code_seq FROM anon;
```

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/db/migrations/20260819000000-case-model-s2.js
git commit -m "feat(api): migration del modelo de caso ampliado (S2)"
```

---

### Task 2: Validators del API

**Files:**
- Modify: `apps/api/src/modules/rescue/cases/cases.validators.ts`
- Create: `apps/api/src/modules/rescue/cases/cases.validators.test.ts`

**Interfaces:**
- Consumes: las columnas de la Task 1.
- Produces:
  - `animalConditionSchema: z.ZodEnum<['herido','sano','asustado','debil','no_pude_acercarme']>`
  - `createCaseSchema` con `title: string` (requerido), `animalCondition?`, `seenAt?: Date`, `listingType: 'found'|'lost'|'at_risk'`, `animalType` con `'ave'`, sin `condition`.
  - `updateCaseSchema` con `title?` y `animalCondition?`, sin `condition`.
  - `listCasesSchema` y `feedCasesSchema` con `listingType` de tres valores y `animalType` con `'ave'`.
  - Los tipos inferidos `CreateCaseInput` y `UpdateCaseInput` cambian en consecuencia; la Task 3 los consume.

**Nota importante sobre `condition`:** Zod, en un `z.object` normal, **descarta** las claves desconocidas en silencio; no las rechaza. Sacar `condition` del schema significa que si alguien lo manda, se ignora. Es el comportamiento correcto y el test lo fija asi — no esperes un error de validacion.

- [ ] **Step 1: Escribir los tests que fallan**

Crear `apps/api/src/modules/rescue/cases/cases.validators.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { createCaseSchema, updateCaseSchema, listCasesSchema } from './cases.validators';

const baseCase = {
  title: 'Perro mediano, herido',
  animalType: 'perro',
  description: 'Perro herido en la calle sin collar',
  location: { lat: -34.6037, lng: -58.3816 },
};

describe('createCaseSchema — titulo', () => {
  it('exige titulo', () => {
    const { title: _omitido, ...sinTitulo } = baseCase;
    expect(createCaseSchema.safeParse(sinTitulo).success).toBe(false);
  });

  it('rechaza un titulo de menos de 3 caracteres', () => {
    expect(createCaseSchema.safeParse({ ...baseCase, title: 'ab' }).success).toBe(false);
  });

  it('rechaza un titulo de mas de 120 caracteres', () => {
    expect(createCaseSchema.safeParse({ ...baseCase, title: 'x'.repeat(121) }).success).toBe(false);
  });
});

describe('createCaseSchema — seenAt', () => {
  it('acepta una fecha reciente', () => {
    const ayer = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    const parsed = createCaseSchema.safeParse({ ...baseCase, seenAt: ayer });
    expect(parsed.success).toBe(true);
  });

  it('rechaza una fecha futura', () => {
    const manana = new Date(Date.now() + 24 * 3600 * 1000).toISOString();
    expect(createCaseSchema.safeParse({ ...baseCase, seenAt: manana }).success).toBe(false);
  });

  it('rechaza una fecha de hace mas de un ano', () => {
    const viejo = new Date(Date.now() - 400 * 24 * 3600 * 1000).toISOString();
    expect(createCaseSchema.safeParse({ ...baseCase, seenAt: viejo }).success).toBe(false);
  });
});

describe('createCaseSchema — valores nuevos', () => {
  it('acepta el tercer tipo de publicacion', () => {
    const parsed = createCaseSchema.safeParse({ ...baseCase, listingType: 'at_risk' });
    expect(parsed.success).toBe(true);
  });

  it('acepta la especie ave', () => {
    expect(createCaseSchema.safeParse({ ...baseCase, animalType: 'ave' }).success).toBe(true);
  });

  it('acepta los cinco estados del animal', () => {
    for (const estado of ['herido', 'sano', 'asustado', 'debil', 'no_pude_acercarme']) {
      expect(createCaseSchema.safeParse({ ...baseCase, animalCondition: estado }).success).toBe(true);
    }
  });

  it('rechaza un estado que no esta en el enum', () => {
    expect(createCaseSchema.safeParse({ ...baseCase, animalCondition: 'muerto' }).success).toBe(false);
  });
});

describe('createCaseSchema — condition retirado', () => {
  // Zod descarta las claves desconocidas en silencio; no las rechaza.
  // Lo que importa es que no lleguen al servicio.
  it('descarta condition sin fallar', () => {
    const parsed = createCaseSchema.safeParse({ ...baseCase, condition: 'herido' });
    expect(parsed.success).toBe(true);
    expect(parsed.success && 'condition' in parsed.data).toBe(false);
  });
});

describe('updateCaseSchema', () => {
  it('acepta editar el titulo', () => {
    expect(updateCaseSchema.safeParse({ title: 'Otro titulo' }).success).toBe(true);
  });

  it('acepta editar el estado del animal', () => {
    expect(updateCaseSchema.safeParse({ animalCondition: 'sano' }).success).toBe(true);
  });
});

describe('listCasesSchema', () => {
  it('filtra por el tercer tipo de publicacion', () => {
    const parsed = listCasesSchema.safeParse({ listingType: 'at_risk' });
    expect(parsed.success).toBe(true);
  });
});
```

- [ ] **Step 2: Correr los tests para verificar que fallan**

```bash
pnpm --filter api test -- cases.validators
```

Esperado: FAIL. Los de titulo fallan porque hoy el campo no existe y el schema lo descarta; los de `at_risk`, `ave` y `animalCondition` fallan por enum.

- [ ] **Step 3: Modificar los validators**

En `cases.validators.ts`, junto a los otros schemas chicos del principio:

```ts
const animalConditionSchema = z.enum([
  'herido', 'sano', 'asustado', 'debil', 'no_pude_acercarme',
]);

const listingTypeSchema = z.enum(['found', 'lost', 'at_risk']);

const animalTypeSchema = z.enum(['perro', 'gato', 'caballo', 'vaca', 'ave', 'otro']);

// Cuando el usuario dice que vio al animal. Los chips del wizard resuelven
// contra el reloj del cliente, asi que las cotas son la unica defensa contra un
// dispositivo con la hora mal: un minuto de tolerancia hacia adelante para el
// desfasaje normal, un ano hacia atras.
const seenAtSchema = z.coerce
  .date()
  .refine((d) => d.getTime() <= Date.now() + 60_000, {
    message: 'La fecha no puede estar en el futuro',
  })
  .refine((d) => d.getTime() >= Date.now() - 365 * 24 * 3600 * 1000, {
    message: 'La fecha no puede ser de hace mas de un ano',
  });
```

`createCaseSchema` queda:

```ts
export const createCaseSchema = z.object({
  listingType: listingTypeSchema.default('found'),
  title: z.string().trim().min(3).max(120),
  animalType: animalTypeSchema,
  description: z.string().trim().min(10).max(2000),
  location: locationSchema,
  locationText: z.string().trim().max(255).optional(),
  referenceNote: z.string().trim().max(255).optional(),
  animalCondition: animalConditionSchema.optional(),
  seenAt: seenAtSchema.optional(),
  urgencyLevel: z.number().int().min(1).max(5).default(1),
  phoneContact: z.string().trim().max(20).optional(),
  imageIds: z.array(z.string().max(500)).max(10).optional(),
  animalSex: animalSexSchema.optional(),
  animalSize: animalSizeSchema.optional(),
  animalColor: animalColorSchema.optional(),
});
```

En `listCasesSchema`: reemplazar el `animalType` y el `listingType` inline por
`animalTypeSchema.optional()` y `listingTypeSchema.optional()`.

En `feedCasesSchema`: reemplazar `listingType` por `listingTypeSchema.optional()`.

En `updateCaseSchema`: sacar `condition`, cambiar `animalType` por
`animalTypeSchema.optional()` y sumar:

```ts
    title: z.string().trim().min(3).max(120).optional(),
    animalCondition: animalConditionSchema.optional(),
```

- [ ] **Step 4: Correr los tests para verificar que pasan**

```bash
pnpm --filter api test -- cases.validators
pnpm --filter api typecheck
```

Esperado: los tests de validators en PASS. El `typecheck` **falla** en
`cases.service.ts` porque `CreateCaseInput` ya no tiene `condition` — eso lo
arregla la Task 3. Anotarlo y seguir.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/rescue/cases/cases.validators.ts apps/api/src/modules/rescue/cases/cases.validators.test.ts
git commit -m "feat(api): titulo, estado del animal, seenAt y tercer tipo en los validators"
```

---

### Task 3: Servicio, orden y modelo del API

**Files:**
- Modify: `apps/api/src/modules/rescue/cases/cases.service.ts`
- Modify: `apps/api/src/modules/rescue/cases/cases.ordering.ts:28-32`
- Modify: `apps/api/src/models/case.model.ts`
- Test: `apps/api/src/modules/rescue/cases/cases.service.test.ts`, `apps/api/src/modules/rescue/cases/cases.ordering.test.ts`

**Interfaces:**
- Consumes: `CreateCaseInput` y `UpdateCaseInput` de la Task 2.
- Produces:
  - `CaseRow` con `title: string`, `publicCode: string`, `animalCondition: string | null`, `seenAt: Date | null`, sin `condition`.
  - `FeedCaseRow` con `title: string`.
  - `buildFeedOrderBy(listingType?: 'found' | 'lost' | 'at_risk'): string`.
  - La Task 4 espeja estos nombres en `apps/web/src/types/case.ts`.

**Lo que estos tests no pueden probar:** `cases.integration.test.ts` mockea el
servicio entero y `cases.service.test.ts` mockea `sequelize.query` — no hay
Postgres en la suite. Que dos casos seguidos no compartan codigo depende de la
secuencia de la base, asi que se verifica con SQL en la Verificacion final, no
con un test. No intentes escribir ese test.

- [ ] **Step 1: Escribir los tests que fallan**

En `cases.ordering.test.ts`, dentro del `describe('buildFeedOrderBy')`:

```ts
  it('ordena los casos en riesgo por urgencia, igual que los encontrados', () => {
    expect(buildFeedOrderBy('at_risk')).toBe(buildFeedOrderBy('found'));
  });
```

En `cases.service.test.ts`, agregar al final:

```ts
describe('SELECT de casos — columnas de S2', () => {
  it('la lista trae titulo, codigo publico, estado y seenAt', async () => {
    await listCases(baseListQuery);
    const sql = sqlOf(0);
    expect(sql).toContain('c.title');
    expect(sql).toContain('c.public_code AS "publicCode"');
    expect(sql).toContain('c.animal_condition AS "animalCondition"');
    expect(sql).toContain('c.seen_at AS "seenAt"');
  });

  it('la lista ya no trae condition', async () => {
    await listCases(baseListQuery);
    expect(sqlOf(0)).not.toContain('c.condition');
  });

  it('el feed trae el titulo, que es lo que muestra la tarjeta', async () => {
    await getFeedCases(baseFeedQuery);
    expect(sqlOf(0)).toContain('c.title');
  });
});
```

- [ ] **Step 2: Correr los tests para verificar que fallan**

```bash
pnpm --filter api test -- cases.ordering cases.service
```

Esperado: FAIL en los cuatro tests nuevos.

- [ ] **Step 3: Ampliar `buildFeedOrderBy`**

En `cases.ordering.ts`, cambiar la firma y el comentario:

```ts
// lost: mas reciente primero. found y at_risk: urgencia, despues menos voluntarios.
// at_risk comparte el criterio de found a proposito — el tercer tipo cambia la
// etiqueta, no el orden.
export function buildFeedOrderBy(listingType?: 'found' | 'lost' | 'at_risk'): string {
  if (listingType === 'lost') return 'c.created_at DESC';
  return `c.urgency_level DESC, ${FEED_VOLUNTEER_COUNT_EXPR} ASC, c.created_at DESC, c.id DESC`;
}
```

- [ ] **Step 4: Actualizar `CaseRow` y `BASE_CASE_SELECT`**

En `cases.service.ts`, en la interfaz `CaseRow`: borrar `condition: string | null;`
y agregar, respetando el orden de las columnas del SELECT:

```ts
  title: string;
  publicCode: string;
  animalCondition: string | null;
  seenAt: Date | null;
```

En `BASE_CASE_SELECT`: reemplazar la linea `c.condition,` por

```
  c.title,
  c.public_code AS "publicCode",
  c.animal_condition AS "animalCondition",
  c.seen_at AS "seenAt",
```

- [ ] **Step 5: Actualizar el INSERT de `createCase`**

En la lista de columnas del INSERT, reemplazar `condition` por `title,
animal_condition, seen_at`. `public_code` **no se escribe**: lo pone el DEFAULT.

```sql
     `INSERT INTO cases
       (id, user_id, listing_type, title, animal_type, description, status, urgency_level,
        location, location_text, reference_note, animal_condition, seen_at, phone_contact,
        animal_sex, animal_size, animal_color,
        created_at, updated_at)
     VALUES
       (gen_random_uuid(), :userId, :listingType, :title, :animalType, :description, 'abierto', :urgencyLevel,
        ST_SetSRID(ST_MakePoint(:lng, :lat), 4326), :locationText, :referenceNote, :animalCondition, :seenAt, :phoneContact,
        :animalSex, :animalSize, :animalColor,
        NOW(), NOW())
```

En el `RETURNING` de ese mismo query, reemplazar `condition,` por:

```
       title,
       public_code AS "publicCode",
       animal_condition AS "animalCondition",
       seen_at AS "seenAt",
```

En `replacements`, reemplazar la linea de `condition` por:

```ts
        title: input.title,
        animalCondition: input.animalCondition ?? null,
        seenAt: input.seenAt ?? null,
```

- [ ] **Step 6: Actualizar `updateCase`**

Reemplazar el bloque de `condition` por estos dos:

```ts
  if (input.title !== undefined) {
    setClauses.push(`title = :title`);
    replacements.title = input.title;
  }
  if (input.animalCondition !== undefined) {
    setClauses.push(`animal_condition = :animalCondition`);
    replacements.animalCondition = input.animalCondition;
  }
```

En el `RETURNING` del UPDATE, hacer el mismo reemplazo de columnas que en el
Step 5 (`condition,` por las cuatro lineas de `title` / `publicCode` /
`animalCondition` / `seenAt`).

- [ ] **Step 7: Actualizar el feed**

En `FeedCaseRow`, agregar `title: string;` despues de `listingType`. En el
SELECT de `getFeedCases`, agregar `c.title,` despues de la linea de
`listing_type`.

- [ ] **Step 8: Poner al dia el modelo Sequelize**

En `apps/api/src/models/case.model.ts`:

```ts
export type AnimalType = 'perro' | 'gato' | 'caballo' | 'vaca' | 'ave' | 'otro';
export type AnimalCondition = 'herido' | 'sano' | 'asustado' | 'debil' | 'no_pude_acercarme';
```

En `CaseAttributes`: borrar `condition: string | null;` y agregar

```ts
  title: string;
  publicCode: string;
  animalCondition: AnimalCondition | null;
  seenAt: Date | null;
```

En `CaseCreationAttributes`, sacar `'condition'` del union de opcionales y
agregar `'publicCode' | 'animalCondition' | 'seenAt'` (el codigo lo pone la base;
los otros dos son nullables).

En la clase: borrar `declare condition: string | null;` y agregar

```ts
  declare title: string;
  declare readonly publicCode: string;
  declare animalCondition: AnimalCondition | null;
  declare seenAt: Date | null;
```

En `Case.init`, borrar el bloque de `condition` y agregar:

```ts
        title: {
          type: DataTypes.STRING(120),
          allowNull: false,
        },
        publicCode: {
          // Lo genera Postgres con una secuencia; el modelo nunca lo escribe.
          type: DataTypes.STRING(12),
          allowNull: false,
        },
        animalCondition: {
          type: DataTypes.STRING(20),
          allowNull: true,
        },
        seenAt: {
          type: DataTypes.DATE,
          allowNull: true,
        },
```

- [ ] **Step 9: Correr todo el api**

```bash
pnpm --filter api test
pnpm --filter api typecheck
pnpm --filter api lint
```

Esperado: los 252 tests que ya habia mas los nuevos, todos en PASS; typecheck y
lint limpios. Si `cases.integration.test.ts` falla, es porque su `fakeCase`
todavia tiene `condition` — sacarlo y agregarle `title`, `publicCode`,
`animalCondition` y `seenAt`.

- [ ] **Step 10: Commit**

```bash
git add apps/api/src/modules/rescue/cases apps/api/src/models/case.model.ts
git commit -m "feat(api): exponer titulo, codigo publico, estado y seenAt en el servicio de casos"
```

---

### Task 4: Tipos y catalogos de etiquetas en web

**Files:**
- Modify: `apps/web/src/types/case.ts`
- Create: `apps/web/src/lib/animalType.ts`
- Create: `apps/web/src/lib/listingType.ts`
- Test: `apps/web/src/lib/listingType.test.ts`

**Interfaces:**
- Consumes: los nombres de campo de la Task 3.
- Produces:
  - `AnimalType` con `'ave'`; `ListingType` con `'at_risk'`; `AnimalCondition`.
  - `CaseItem` con `title`, `publicCode`, `animalCondition`, `seenAt`; sin `condition`.
  - `CreateCaseInput` con `title` (requerido), `animalCondition?`, `seenAt?`; sin `condition`.
  - `ANIMAL_LABEL` y `ANIMAL_EMOJI` desde `lib/animalType`.
  - `LISTING_TYPE: Record<ListingType, ListingTypeStyle>` desde `lib/listingType`.
  - `CONDITION_LABEL: Record<AnimalCondition, string>` desde `lib/animalType`.
  - Las Tasks 5 y 7 importan estos catalogos.

**Por que los catalogos:** `ANIMAL_LABEL` y `ANIMAL_EMOJI` estan copiados en seis
archivos como `Record<AnimalType, string>`. Sumar `'ave'` rompe el typecheck en
los seis, asi que hay que tocarlos igual; consolidarlos cuesta lo mismo y deja
una sola lista.

El caso de `listingType` es peor: hoy se resuelve con ternarios
(`listingType === 'lost' ? A : B`) en cinco lugares. Un tercer valor **no rompe
el typecheck**: `at_risk` caeria silenciosamente en la rama de "Encontre". Un
`Record` exhaustivo convierte ese bug silencioso en un error de compilacion.

- [ ] **Step 1: Escribir el test que falla**

Crear `apps/web/src/lib/listingType.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { LISTING_TYPE } from './listingType'

describe('LISTING_TYPE', () => {
  it('tiene una entrada propia para cada tipo de publicacion', () => {
    expect(Object.keys(LISTING_TYPE).sort()).toEqual(['at_risk', 'found', 'lost'])
  })

  it('no muestra un caso en riesgo como encontrado', () => {
    // El bug que este catalogo previene: con ternarios, at_risk caia en la rama
    // de found sin que el typecheck dijera nada.
    expect(LISTING_TYPE.at_risk.short).not.toBe(LISTING_TYPE.found.short)
    expect(LISTING_TYPE.at_risk.chipClass).not.toBe(LISTING_TYPE.found.chipClass)
  })
})
```

- [ ] **Step 2: Correr el test para verificar que falla**

```bash
pnpm --filter web test -- listingType
```

Esperado: FAIL, "Failed to resolve import ./listingType".

- [ ] **Step 3: Actualizar los tipos**

En `apps/web/src/types/case.ts`:

```ts
export type AnimalType = 'perro' | 'gato' | 'caballo' | 'vaca' | 'ave' | 'otro'
export type AnimalCondition = 'herido' | 'sano' | 'asustado' | 'debil' | 'no_pude_acercarme'
export type ListingType = 'found' | 'lost' | 'at_risk'
```

En `CaseItem`: borrar `condition: string | null` y agregar

```ts
  title: string
  publicCode: string
  animalCondition: AnimalCondition | null
  seenAt: string | null
```

En `CreateCaseInput`: borrar `condition?: string` y agregar

```ts
  title: string
  animalCondition?: AnimalCondition
  seenAt?: string
```

- [ ] **Step 4: Crear los catalogos**

`apps/web/src/lib/animalType.ts`:

```ts
import type { AnimalType, AnimalCondition } from '../types/case'

// Estos dos vivian copiados en CaseCard, CaseDetailSheet, HomeFeed, LeafletMap,
// CasePage y PublishCasePage. Sumar una especie obligaba a tocar los seis.
export const ANIMAL_LABEL: Record<AnimalType, string> = {
  perro: 'Perro',
  gato: 'Gato',
  caballo: 'Caballo',
  vaca: 'Vaca',
  ave: 'Ave',
  otro: 'Otro',
}

export const ANIMAL_EMOJI: Record<AnimalType, string> = {
  perro: '🐕',
  gato: '🐈',
  caballo: '🐴',
  vaca: '🐄',
  ave: '🐦',
  otro: '🐾',
}

export const CONDITION_LABEL: Record<AnimalCondition, string> = {
  herido: 'Herido',
  sano: 'Sano',
  asustado: 'Asustado',
  debil: 'Débil',
  no_pude_acercarme: 'No me pude acercar',
}
```

`apps/web/src/lib/listingType.ts`:

```ts
import type { ListingType } from '../types/case'

interface ListingTypeStyle {
  /** Chip de la tarjeta */
  short: string
  /** Ficha y panel del mapa */
  long: string
  /** Encabezado de la pagina del caso */
  upper: string
  chipClass: string
  ringClass: string
  /** Color del pin en el mapa */
  pinColor: string
}

// Un Record exhaustivo y no ternarios: con `listingType === 'lost' ? A : B`, un
// valor nuevo cae en la rama del else sin que el typecheck se entere.
export const LISTING_TYPE: Record<ListingType, ListingTypeStyle> = {
  found: {
    short: 'Encontré',
    long: 'Encontrado',
    upper: 'ENCONTRADO',
    chipClass: 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300',
    ringClass: 'ring-1 ring-green-300',
    pinColor: '#22c55e',
  },
  lost: {
    short: 'Busco',
    long: 'Buscado',
    upper: 'BUSCADO',
    chipClass: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300',
    ringClass: 'ring-1 ring-blue-300',
    pinColor: '#3b82f6',
  },
  at_risk: {
    short: 'En riesgo',
    long: 'En riesgo',
    upper: 'EN RIESGO',
    chipClass: 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300',
    ringClass: 'ring-1 ring-amber-300',
    pinColor: '#f59e0b',
  },
}
```

- [ ] **Step 5: Correr el test para verificar que pasa**

```bash
pnpm --filter web test -- listingType
```

Esperado: PASS. El `typecheck` de web todavia falla: las pantallas siguen
leyendo `condition` y tienen sus propios `Record<AnimalType, string>` sin `ave`.
Eso lo arregla la Task 5.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/types/case.ts apps/web/src/lib/animalType.ts apps/web/src/lib/listingType.ts apps/web/src/lib/listingType.test.ts
git commit -m "feat(web): tipos de S2 y catalogos unicos de especie y tipo de publicacion"
```

---

### Task 5: Las cuatro pantallas de lectura

**Files:**
- Create: `apps/web/src/lib/time.ts`
- Test: `apps/web/src/lib/time.test.ts`
- Modify: `apps/web/src/components/cases/CaseCard.tsx`
- Modify: `apps/web/src/components/cases/CaseDetailSheet.tsx`
- Modify: `apps/web/src/pages/CasePage.tsx`
- Modify: `apps/web/src/pages/DashboardPage.tsx:257`
- Modify: `apps/web/src/components/cases/HomeFeed.tsx`
- Modify: `apps/web/src/components/map/LeafletMap.tsx:18-29`

**Interfaces:**
- Consumes: los tipos y catalogos de la Task 4.
- Produces: `timeAgo(iso: string): string` desde `lib/time`. Nada mas que las tasks siguientes usen.

**Contexto:** hoy ninguna pantalla tiene encabezado — la tarjeta muestra la
descripcion recortada a dos lineas y la ficha la muestra como cuerpo. Esta task
mete el titulo como encabezado, agrega el codigo y el estado a las fichas, y de
paso apaga tres duplicaciones que el cambio de tipos obliga a tocar igual.

**`timeAgo` esta copiado cuatro veces y las copias divergieron:** la de
`CaseCard.tsx:39` devuelve `hace 2m` para los meses —que se lee como dos
minutos— mientras que `CaseDetailSheet` y `CasePage` devuelven `hace 2 meses`.
La de `HomeFeed` usa otra escala. Gana la version de `CaseDetailSheet`.

- [ ] **Step 1: Escribir el test que falla**

Crear `apps/web/src/lib/time.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { timeAgo } from './time'

const haceHoras = (h: number) => new Date(Date.now() - h * 3_600_000).toISOString()

describe('timeAgo', () => {
  it('dice "hace unos minutos" antes de la hora', () => {
    expect(timeAgo(haceHoras(0.5))).toBe('hace unos minutos')
  })

  it('cuenta horas dentro del dia', () => {
    expect(timeAgo(haceHoras(5))).toBe('hace 5h')
  })

  it('cuenta dias hasta el mes', () => {
    expect(timeAgo(haceHoras(48))).toBe('hace 2d')
  })

  it('escribe "meses" completo y no "m", que se lee como minutos', () => {
    expect(timeAgo(haceHoras(24 * 65))).toBe('hace 2 meses')
  })
})
```

- [ ] **Step 2: Correr el test para verificar que falla**

```bash
pnpm --filter web test -- time
```

Esperado: FAIL, "Failed to resolve import ./time".

- [ ] **Step 3: Crear `lib/time.ts`**

```ts
// Estaba copiada en CaseCard, CaseDetailSheet, CasePage y HomeFeed, y las copias
// divergieron: la de CaseCard abreviaba los meses como "m", que se lee como
// minutos. Gana la version larga.
export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const h = Math.floor(diff / 3_600_000)
  if (h < 1) return 'hace unos minutos'
  if (h < 24) return `hace ${h}h`
  const d = Math.floor(h / 24)
  if (d < 30) return `hace ${d}d`
  return `hace ${Math.floor(d / 30)} meses`
}

export function formatExact(iso: string): string {
  return new Date(iso).toLocaleString('es-AR', {
    day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}
```

- [ ] **Step 4: Correr el test para verificar que pasa**

```bash
pnpm --filter web test -- time
```

Esperado: PASS.

- [ ] **Step 5: `CaseCard.tsx`**

Borrar las constantes `ANIMAL_LABEL` y `ANIMAL_EMOJI` (lineas 4-5) y las
funciones locales `timeAgo` y `formatExact`; importarlas:

```tsx
import { ANIMAL_LABEL, ANIMAL_EMOJI } from '../../lib/animalType'
import { LISTING_TYPE } from '../../lib/listingType'
import { timeAgo, formatExact } from '../../lib/time'
```

Reemplazar el chip de tipo (lineas 87-89) por:

```tsx
            <span className={`text-xs px-2 py-0.5 rounded font-medium ${LISTING_TYPE[c.listingType].chipClass}`}>
              {LISTING_TYPE[c.listingType].short}
            </span>
```

Y en la linea 98, poner el titulo como encabezado arriba de la descripcion:

```tsx
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 line-clamp-1 mb-0.5">{c.title}</h3>
          <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2 mb-2">{c.description}</p>
```

- [ ] **Step 6: `CaseDetailSheet.tsx`**

Mismos borrados e importaciones que en el Step 5 (aca las constantes estan en
las lineas 25-26 y `timeAgo`/`formatExact` en la 60). Sumar `CONDITION_LABEL`
al import de `lib/animalType`, que esta pantalla si lo usa.

Reemplazar el ternario del tipo (lineas 287-291) por
`LISTING_TYPE[detail.listingType].chipClass` y `.long`.

Arriba de la descripcion (linea 320), el encabezado con el codigo:

```tsx
              <div className="flex items-baseline gap-2 mb-1">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{detail.title}</h2>
                <button
                  type="button"
                  onClick={() => navigator.clipboard?.writeText(detail.publicCode)}
                  title="Copiar el codigo del caso"
                  className="font-mono text-xs text-gray-500 dark:text-gray-400 hover:text-primary-600"
                >
                  #{detail.publicCode}
                </button>
              </div>
```

Donde la ficha lista los datos del animal, sumar el estado y el visto:

```tsx
              {detail.animalCondition && (
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  <span className="font-medium">Estado:</span> {CONDITION_LABEL[detail.animalCondition]}
                </p>
              )}
              {detail.seenAt && (
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  <span className="font-medium">Visto:</span> {timeAgo(detail.seenAt)}
                </p>
              )}
```

Borrar cualquier renderizado de `detail.condition` que quede.

- [ ] **Step 7: `CasePage.tsx`**

Igual que el Step 6: importar los catalogos (constantes en 17-18, `timeAgo` en
64), reemplazar el ternario de las lineas 270-271 por
`LISTING_TYPE[detail.listingType].upper`, `.chipClass` y `.ringClass`, meter el
mismo encabezado con titulo y `#codigo`, y las dos lineas de estado y visto.
Borrar el renderizado de `detail.condition`.

- [ ] **Step 8: `DashboardPage.tsx`**

Hay una `CaseCard` propia en la linea 257 —es un componente distinto del de
`components/cases/CaseCard.tsx`, con el mismo nombre. Agregarle el titulo como
encabezado y, si usa un ternario de `listingType`, cambiarlo por `LISTING_TYPE`.

- [ ] **Step 9: `HomeFeed.tsx`**

Borrar `ANIMAL_EMOJI`, `ANIMAL_LABEL` (29-30) y `timeAgo` (49); importarlos.
Agregar `title: string` a la interfaz `FeedRow`. Mostrarlo en `UrgentCard`
arriba de la ubicacion:

```tsx
        <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 line-clamp-1 mb-0.5">{row.title}</p>
```

Reemplazar los ternarios de las lineas 105-107 por `LISTING_TYPE`.

Sumar la cuarta pestana y el chip de Ave:

```tsx
type Tab = 'all' | 'found' | 'lost' | 'at_risk'

const TABS: { id: Tab; label: string }[] = [
  { id: 'all', label: 'Todos' },
  { id: 'found', label: 'Encontrados' },
  { id: 'lost', label: 'Buscados' },
  { id: 'at_risk', label: 'En riesgo' },
]
```

En `ANIMAL_CHIPS`, agregar `{ value: 'ave', label: '🐦 Ave' }` antes de "Otro".

Y en la linea 197, el filtro deja de ser un ternario:

```tsx
      listingType: tab === 'all' ? undefined : tab,
```

- [ ] **Step 10: `LeafletMap.tsx`**

Borrar `ANIMAL_EMOJI` (linea 18) e importarlo. En la linea 29, reemplazar el
ternario del color por `LISTING_TYPE[c.listingType].pinColor`.

- [ ] **Step 11: Verificar web entera**

```bash
pnpm --filter web typecheck
pnpm --filter web lint
pnpm --filter web test
```

Esperado: los tres limpios. Si el typecheck todavia se queja de `condition` o de
un `Record<AnimalType, string>` incompleto, quedo un archivo sin migrar —
`PublishCasePage.tsx` es el ultimo y lo cubre la Task 7.

- [ ] **Step 12: Commit**

```bash
git add apps/web/src
git commit -m "feat(web): titulo, codigo y estado del animal en las pantallas de caso"
```

---

### Task 6: La sugerencia de titulo

**Files:**
- Create: `apps/web/src/lib/caseTitle.ts`
- Test: `apps/web/src/lib/caseTitle.test.ts`
- Create: `apps/web/src/lib/useSuggestedTitle.ts`
- Test: `apps/web/src/lib/useSuggestedTitle.test.ts`

**Interfaces:**
- Consumes: `AnimalType`, `AnimalSize`, `AnimalCondition` de `types/case`.
- Produces:
  - `suggestCaseTitle(animalType: AnimalType | '', animalSize: AnimalSize | '', animalCondition: AnimalCondition | ''): string`
  - `useSuggestedTitle(animalType, animalSize, animalCondition): { title: string; setTitle: (v: string) => void }`
  - La Task 7 usa el hook dentro de `PublishCasePage`.

**Nombre:** la spec la llamaba `sugerirTitulo`; el CLAUDE.md pide codigo en
ingles, asi que se llama `suggestCaseTitle`. Es el mismo comportamiento.

**Por que un hook y no el efecto suelto en la pagina:** la regla "sigue la
sugerencia hasta que el usuario lo edita" es la unica logica no obvia de la
tanda, y adentro del wizard solo se puede probar navegando cuatro pasos en jsdom
—con subida de fotos y geolocalizacion de por medio. En un hook se prueba en
tres lineas.

- [ ] **Step 1: Escribir los tests que fallan**

Crear `apps/web/src/lib/caseTitle.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { suggestCaseTitle } from './caseTitle'

describe('suggestCaseTitle', () => {
  it('junta especie, tamano y estado', () => {
    expect(suggestCaseTitle('perro', 'mediano', 'herido')).toBe('Perro mediano, herido')
  })

  it('omite el tamano cuando no se eligio', () => {
    expect(suggestCaseTitle('gato', '', 'asustado')).toBe('Gato, asustado')
  })

  it('omite el estado cuando no se eligio', () => {
    expect(suggestCaseTitle('perro', 'grande', '')).toBe('Perro grande')
  })

  it('devuelve solo la especie cuando no hay nada mas', () => {
    expect(suggestCaseTitle('vaca', '', '')).toBe('Vaca')
  })

  it('devuelve vacio mientras no haya especie, para no precargar un titulo falso', () => {
    expect(suggestCaseTitle('', 'chico', 'herido')).toBe('')
  })

  it('escribe el estado en minuscula, que va en medio de la frase', () => {
    expect(suggestCaseTitle('ave', '', 'no_pude_acercarme')).toBe('Ave, no me pude acercar')
  })

  it('nunca pasa de los 120 caracteres que acepta el API', () => {
    expect(suggestCaseTitle('caballo', 'grande', 'no_pude_acercarme').length).toBeLessThanOrEqual(120)
  })
})
```

- [ ] **Step 2: Correr los tests para verificar que fallan**

```bash
pnpm --filter web test -- caseTitle
```

Esperado: FAIL, "Failed to resolve import ./caseTitle".

- [ ] **Step 3: Escribir la funcion**

`apps/web/src/lib/caseTitle.ts`:

```ts
import { ANIMAL_LABEL, CONDITION_LABEL } from './animalType'
import type { AnimalType, AnimalSize, AnimalCondition } from '../types/case'

/**
 * El titulo que el wizard precarga: "Perro mediano, herido".
 *
 * Devuelve vacio mientras no haya especie —precargar "Animal" apenas se abre el
 * paso seria ponerle al usuario un titulo que no eligio y que probablemente
 * publique tal cual.
 */
export function suggestCaseTitle(
  animalType: AnimalType | '',
  animalSize: AnimalSize | '',
  animalCondition: AnimalCondition | '',
): string {
  if (!animalType) return ''
  const especie = ANIMAL_LABEL[animalType]
  const conTamano = animalSize ? `${especie} ${animalSize}` : especie
  if (!animalCondition) return conTamano
  return `${conTamano}, ${CONDITION_LABEL[animalCondition].toLowerCase()}`
}
```

- [ ] **Step 4: Correr los tests para verificar que pasan**

```bash
pnpm --filter web test -- caseTitle
```

Esperado: los siete en PASS.

- [ ] **Step 5: Escribir el test del hook, que falla**

Crear `apps/web/src/lib/useSuggestedTitle.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useSuggestedTitle } from './useSuggestedTitle'
import type { AnimalType, AnimalSize, AnimalCondition } from '../types/case'

type Props = {
  animalType: AnimalType | ''
  animalSize: AnimalSize | ''
  animalCondition: AnimalCondition | ''
}

const inicial: Props = { animalType: '', animalSize: '', animalCondition: '' }

const render = (props: Props = inicial) =>
  renderHook((p: Props) => useSuggestedTitle(p.animalType, p.animalSize, p.animalCondition), {
    initialProps: props,
  })

describe('useSuggestedTitle', () => {
  it('sigue a la derivacion mientras nadie lo toque', () => {
    const { result, rerender } = render()
    expect(result.current.title).toBe('')

    rerender({ ...inicial, animalType: 'perro' })
    expect(result.current.title).toBe('Perro')

    rerender({ ...inicial, animalType: 'perro', animalSize: 'mediano' })
    expect(result.current.title).toBe('Perro mediano')
  })

  it('deja de sugerir en cuanto el usuario edita el titulo', () => {
    const { result, rerender } = render({ ...inicial, animalType: 'perro' })
    expect(result.current.title).toBe('Perro')

    act(() => result.current.setTitle('Firulais'))
    expect(result.current.title).toBe('Firulais')

    rerender({ ...inicial, animalType: 'gato', animalSize: 'chico' })
    expect(result.current.title).toBe('Firulais')
  })

  it('no vuelve a sugerir aunque el usuario borre lo que escribio', () => {
    // Borrar el campo es una edicion mas: si volviera a precargarse, el usuario
    // no tendria forma de dejarlo vacio a proposito antes de escribir el suyo.
    const { result, rerender } = render({ ...inicial, animalType: 'perro' })
    act(() => result.current.setTitle(''))
    rerender({ ...inicial, animalType: 'gato' })
    expect(result.current.title).toBe('')
  })
})
```

Correr y verificar que falla:

```bash
pnpm --filter web test -- useSuggestedTitle
```

Esperado: FAIL, "Failed to resolve import ./useSuggestedTitle".

- [ ] **Step 6: Escribir el hook**

`apps/web/src/lib/useSuggestedTitle.ts`:

```ts
import { useState } from 'react'
import { suggestCaseTitle } from './caseTitle'
import type { AnimalType, AnimalSize, AnimalCondition } from '../types/case'

/**
 * El titulo del wizard: precargado con la derivacion mientras el usuario no lo
 * haya tocado, suyo para siempre en cuanto lo edita.
 *
 * La sugerencia se calcula en el render y no en un efecto: con useEffect el
 * campo mostraria el valor viejo por un frame cada vez que cambia la especie.
 */
export function useSuggestedTitle(
  animalType: AnimalType | '',
  animalSize: AnimalSize | '',
  animalCondition: AnimalCondition | '',
): { title: string; setTitle: (v: string) => void } {
  const [edited, setEdited] = useState<string | null>(null)

  const setTitle = (v: string) => setEdited(v)

  return {
    title: edited ?? suggestCaseTitle(animalType, animalSize, animalCondition),
    setTitle,
  }
}
```

- [ ] **Step 7: Correr los tests del hook**

```bash
pnpm --filter web test -- caseTitle useSuggestedTitle
```

Esperado: los diez en PASS.

- [ ] **Step 8: Commit**

```bash
git add apps/web/src/lib/caseTitle.ts apps/web/src/lib/caseTitle.test.ts apps/web/src/lib/useSuggestedTitle.ts apps/web/src/lib/useSuggestedTitle.test.ts
git commit -m "feat(web): sugerencia de titulo derivada de especie, tamano y estado"
```

---

### Task 7: El wizard

**Files:**
- Modify: `apps/web/src/pages/PublishCasePage.tsx`

**Interfaces:**
- Consumes: `useSuggestedTitle` (Task 6), `LISTING_TYPE`, `ANIMAL_LABEL`, `ANIMAL_EMOJI`, `CONDITION_LABEL` (Task 4), `CreateCaseInput` (Task 4).
- Produces: nada que consuman otras tasks. Es la ultima.

**Esta task no lleva test propio.** La unica logica no obvia del wizard —la regla
del titulo sugerido— ya quedo cubierta en la Task 6, donde se prueba aislada. Lo
que queda aca es cableado de formulario: el gate son `typecheck`, `lint`, `build`
y el recorrido visual del Step 9.

**Mapa del archivo** (1121 lineas, un componente por paso al final):
`StepTipo` en la 358, `StepIndicator` en la 400, `StepDescripcion` en la 923,
`StepContacto` cerca de la 1097. El estado vive en `WizardState` (linea 22) y la
validacion por paso en `validateStep` (linea 154).

- [ ] **Step 1: Estado del wizard**

En `WizardState` (linea 22): reemplazar `condition: string` por

```tsx
  animalCondition: AnimalCondition | ''
  seenAt: string | null
  /** Cual chip de "cuando lo viste" esta activo; '' es ninguno */
  cuando: string
```

En el estado inicial (linea 64), `animalCondition: ''`, `seenAt: null`,
`cuando: ''`, y borrar `condition: ''`.

El titulo **no** vive en `WizardState`: lo maneja el hook, que ya sabe cuando
seguir a la derivacion y cuando no.

```tsx
  const { title, setTitle } = useSuggestedTitle(state.animalType, state.animalSize, state.animalCondition)
```

- [ ] **Step 2: `StepTipo` — la tercera tarjeta**

Despues del boton de "Busco mi mascota" (linea 380), con el mismo patron:

```tsx
        <button
          onClick={() => onSelect('at_risk')}
          className="flex items-start gap-4 p-5 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-amber-400 hover:bg-amber-50 active:bg-amber-100 transition-colors text-left group"
        >
          <span className="text-3xl mt-0.5">⚠️</span>
          <div>
            <p className="font-semibold text-gray-900 dark:text-gray-100 group-hover:text-amber-700">
              Vi un animal en riesgo
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              Viste un animal en peligro pero no te pudiste quedar con él.
            </p>
          </div>
        </button>
```

El encabezado del paso (linea 268) tambien deja de ser un ternario:

```tsx
              <h1 className="text-2xl font-semibold">
                {state.listingType === 'lost' ? 'Buscar mi mascota' : 'Reportar animal encontrado'}
              </h1>
```

pasa a

```tsx
const TITULO_POR_TIPO: Record<ListingType, string> = {
  found: 'Reportar animal encontrado',
  lost: 'Buscar mi mascota',
  at_risk: 'Reportar animal en riesgo',
}
```

y `{TITULO_POR_TIPO[state.listingType ?? 'found']}` en el JSX.

- [ ] **Step 3: `StepUbicacion` — cuando lo viste**

Agregar al final del paso, despues de la nota de referencia. Los chips resuelven
contra el reloj del cliente; "Otra fecha" guarda **mediodia local** para que la
zona horaria no corra el dia publicado al anterior.

```tsx
const CUANDO_OPCIONES: { id: string; label: string; minutos: number }[] = [
  { id: 'ahora', label: 'Ahora mismo', minutos: 0 },
  { id: 'hora', label: 'Hace menos de 1 hora', minutos: 30 },
  { id: 'hoy', label: 'Hoy más temprano', minutos: 5 * 60 },
  { id: 'ayer', label: 'Ayer', minutos: 24 * 60 },
]

function fechaDeChip(minutos: number): string {
  return new Date(Date.now() - minutos * 60_000).toISOString()
}

// El input date da 'YYYY-MM-DD'. Se ancla al mediodia local: a las 00:00 el
// pasaje a UTC puede correr la fecha al dia anterior segun la zona.
function fechaDeInput(valor: string): string {
  const [a, m, d] = valor.split('-').map(Number)
  return new Date(a, m - 1, d, 12, 0, 0).toISOString()
}
```

El JSX, usando el `Chip` de `components/ui`:

```tsx
      <div>
        <label className="block text-sm font-medium mb-2">¿Cuándo lo viste?</label>
        <div className="flex flex-wrap gap-2">
          {CUANDO_OPCIONES.map((o) => (
            <Chip key={o.id} active={cuando === o.id} onClick={() => onCuandoChange(o.id, fechaDeChip(o.minutos))}>
              {o.label}
            </Chip>
          ))}
          <Chip active={cuando === 'otra'} onClick={() => onCuandoChange('otra', null)}>
            Otra fecha
          </Chip>
        </div>
        {cuando === 'otra' && (
          <input
            type="date"
            max={new Date().toISOString().slice(0, 10)}
            className="mt-2 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-base"
            onChange={(e) => onSeenAtChange(e.target.value ? fechaDeInput(e.target.value) : null)}
          />
        )}
      </div>
```

El `text-base` del input no es decorativo: con menos de 16px, Safari en iOS hace
zoom al enfocar.

- [ ] **Step 4: `StepDescripcion` — titulo, Ave y estado**

En el selector de especie, agregar `ave` importando `ANIMAL_LABEL` y
`ANIMAL_EMOJI` de `lib/animalType` y borrando el `ANIMAL_LABELS` local de la
linea 39.

Arriba de todo el paso, el campo de titulo:

```tsx
      <Input
        label="Título"
        value={title}
        maxLength={120}
        onChange={(e) => onTitleChange(e.target.value)}
        placeholder="Ej: Perro mediano, herido"
      />
      <p className="text-xs text-gray-500 dark:text-gray-400 -mt-2">
        Lo completamos con lo que elegís. Podés reescribirlo.
      </p>
```

El padre pasa el `title` y el `setTitle` que devuelve el hook, tal cual:

```tsx
                title={title}
                onTitleChange={setTitle}
```

Reemplazar el textarea de "Condición" (linea 985) por los chips de estado, solo
para `found` y `at_risk`:

```tsx
      {listingType !== 'lost' && (
        <div>
          <label className="block text-sm font-medium mb-2">Estado del animal (opcional)</label>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(CONDITION_LABEL) as AnimalCondition[]).map((c) => (
              <Chip key={c} active={animalCondition === c} onClick={() => onAnimalConditionChange(animalCondition === c ? '' : c)}>
                {CONDITION_LABEL[c]}
              </Chip>
            ))}
          </div>
        </div>
      )}
```

En `lost` no va nada en su lugar: las senas particulares pasan a la descripcion.
Ajustar el placeholder de la descripcion para `lost` de modo que lo pida:
`"Contá cómo es: color, tamaño, collar, señas particulares..."`.

- [ ] **Step 5: `validateStep` y `submit`**

En `validateStep`, dentro del `if (step === 3)`:

```tsx
      if (title.trim().length < 3) newErrors.title = 'Poné un título de al menos 3 caracteres.'
```

`title` viene del hook, no de `state`. Agregar `title?: string` al tipo de
`errors`.

En `submit`, reemplazar la linea de `condition` por:

```tsx
        title: title.trim(),
        animalCondition: state.animalCondition || undefined,
        seenAt: state.seenAt ?? undefined,
```

- [ ] **Step 6: `StepContacto` — el preview**

En el resumen (linea 1097), agregar el titulo como primera linea y cambiar el
ternario del tipo por `LISTING_TYPE[summary.listingType ?? 'found'].long`:

`StepContacto` recibe `summary={state}`, que ya no tiene el titulo: pasarle
`title={title}` aparte.

```tsx
        <p className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-1">{title}</p>
```

El codigo publico **no** va en el preview: lo genera Postgres al insertar, asi
que todavia no existe.

- [ ] **Step 7: Correr todo web**

```bash
pnpm --filter web test
pnpm --filter web typecheck
pnpm --filter web lint
pnpm --filter web build
```

Esperado: los cuatro limpios.

- [ ] **Step 8: Recorrido visual**

Levantar `pnpm dev` y recorrer el wizard entero en el navegador, publicando un
caso de verdad. Verificar:

1. Las tres tarjetas del paso 0 y que "Vi un animal en riesgo" lleve al paso 1.
2. Que el titulo se precargue al elegir especie y que **deje de cambiar** en
   cuanto se lo edita.
3. Que los chips de "cuando" y el input de fecha se vean bien en 375px de ancho.
4. Que el caso publicado aparezca en Inicio con su titulo, y que la ficha
   muestre `#C-10xx`, el estado y el "visto".

Dos trampas conocidas al levantar el entorno local:

- **No pipear el server de dev a `tail`** en un task de background: `tail`
  bufferea y el archivo de salida queda vacio hasta que el proceso termine.
  Verificar el puerto con `netstat -ano | grep :3000` y un `curl`.
- **La zona con casos es Capitan Sarmiento**, no Pergamino: con Pergamino el
  Inicio queda vacio y parece un bug.

- [ ] **Step 9: Commit**

```bash
git add apps/web/src/pages/PublishCasePage.tsx
git commit -m "feat(web): titulo, estado del animal, cuando lo viste y tercer tipo en el wizard"
```

---

## Verificacion final

Antes de abrir el PR, con todas las tasks hechas:

```bash
pnpm --filter api test && pnpm --filter api typecheck && pnpm --filter api lint
pnpm --filter web test && pnpm --filter web typecheck && pnpm --filter web lint && pnpm --filter web build
```

Y una comprobacion contra la base, que ningun test cubre porque los tests del
api mockean el servicio:

```sql
SELECT public_code, title, animal_condition, seen_at, listing_type
FROM cases ORDER BY created_at DESC LIMIT 5;
```

Esperado: los casos publicados en el recorrido visual con codigos distintos y
consecutivos.

**Al mergear:** la migration hay que correrla en prod. Ver el patron de PRs
anteriores con migration.
