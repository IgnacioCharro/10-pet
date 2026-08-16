# Roles de usuario en el panel de admin — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** que el panel de admin muestre el rol de cada usuario, permita cambiarlo, y que el ✓ de "Profesional verificado" deje de ser autodeclarado.

**Architecture:** una columna `users.role` con CHECK espejo en Postgres. El permiso de admin **no** se muda a la base: sigue saliendo de `ADMIN_EMAILS`, y la columna solo lo etiqueta. Las dos reglas de negocio (rol⟺`is_vet`, y admin intocable) viven en un modulo puro con tests, porque las suites de integracion de este repo mockean la base y no ejecutan SQL.

**Tech Stack:** Node 20 + TypeScript strict, Express, Sequelize, Postgres (Supabase), Zod, Vitest, React 18 + Tailwind.

**Spec:** `docs/superpowers/specs/2026-08-16-panel-admin-roles-design.md`

## Global Constraints

- Codigo en ingles. Comentarios y commits en espanol **sin acentos**; texto que lee una persona (mensajes de error, labels) **con acentos**.
- Sin emojis en codigo ni en commits.
- Conventional Commits: `feat:`, `fix:`, `docs:`, `test:`, `refactor:`.
- Errores del API con el formato `{ error: { code, message, fields? } }`.
- Todo endpoint valida con Zod (body, query, params).
- Los cinco roles, exactos y en este orden: `comun`, `tester`, `voluntario`, `veterinario`, `admin`.
- Cada `z.enum` tiene un CHECK espejo en Postgres. Sumar un valor solo en Zod hace que el insert rebote con 23514.
- El API **no** corre migrations al desplegar. Toda migration se aplica a mano antes de mergear, con su fila en `SequelizeMeta`.
- No tocar `modules/community/`.

---

### Task 1: Modulo puro con las reglas de rol

**Files:**
- Create: `apps/api/src/modules/moderation/admin/admin.roles.ts`
- Test: `apps/api/src/modules/moderation/admin/admin.roles.test.ts`

**Interfaces:**
- Consumes: nada.
- Produces:
  - `type UserRole = 'comun' | 'tester' | 'voluntario' | 'veterinario' | 'admin'`
  - `const USER_ROLES: readonly UserRole[]`
  - `function isVetForRole(role: UserRole): boolean`
  - `function isAdminEmail(email: string, rawAdminEmails: string | undefined): boolean`

- [ ] **Step 1: Write the failing test**

```typescript
// apps/api/src/modules/moderation/admin/admin.roles.test.ts
import { describe, it, expect } from 'vitest';
import { USER_ROLES, isVetForRole, isAdminEmail } from './admin.roles';

describe('USER_ROLES', () => {
  it('tiene los cinco roles en orden', () => {
    expect(USER_ROLES).toEqual(['comun', 'tester', 'voluntario', 'veterinario', 'admin']);
  });
});

describe('isVetForRole', () => {
  it('solo veterinario da true', () => {
    expect(isVetForRole('veterinario')).toBe(true);
  });

  it('cualquier otro rol da false', () => {
    for (const role of ['comun', 'tester', 'voluntario', 'admin'] as const) {
      expect(isVetForRole(role)).toBe(false);
    }
  });
});

describe('isAdminEmail', () => {
  it('reconoce un email de la lista sin importar mayusculas ni espacios', () => {
    expect(isAdminEmail('Admin@Ejemplo.com', ' admin@ejemplo.com , otro@ejemplo.com ')).toBe(true);
  });

  it('devuelve false para un email que no esta', () => {
    expect(isAdminEmail('otro@ejemplo.com', 'admin@ejemplo.com')).toBe(false);
  });

  it('devuelve false con la variable vacia o sin definir', () => {
    expect(isAdminEmail('admin@ejemplo.com', '')).toBe(false);
    expect(isAdminEmail('admin@ejemplo.com', undefined)).toBe(false);
  });

  it('no toma la cadena vacia entre comas como un email', () => {
    expect(isAdminEmail('', 'admin@ejemplo.com,,')).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter api test -- admin.roles`
Expected: FAIL — `Cannot find module './admin.roles'`

- [ ] **Step 3: Write minimal implementation**

```typescript
// apps/api/src/modules/moderation/admin/admin.roles.ts

/**
 * Reglas de rol, sin base de datos ni Express.
 *
 * Viven aparte porque las suites de integracion de este repo mockean
 * `../../../db`: si estas reglas vivieran solo en el service, ningun test las
 * ejecutaria de verdad. Mismo patron que `cases.ordering.ts`.
 */

// Espejo del CHECK users_role_check. Sumar un valor aca sin la migration
// correspondiente hace que el update rebote contra el constraint (23514).
export const USER_ROLES = ['comun', 'tester', 'voluntario', 'veterinario', 'admin'] as const;

export type UserRole = (typeof USER_ROLES)[number];

/**
 * `is_vet` pasa a ser derivado del rol: el panel es el unico que lo escribe.
 * Los dos campos no pueden divergir.
 */
export function isVetForRole(role: UserRole): boolean {
  return role === 'veterinario';
}

/**
 * El permiso de admin sale de ADMIN_EMAILS, no de la columna. Se lee crudo y se
 * parsea aca para que la regla sea testeable sin tocar process.env.
 */
export function isAdminEmail(email: string, rawAdminEmails: string | undefined): boolean {
  if (!email) return false;
  const admins = new Set(
    (rawAdminEmails ?? '')
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
  );
  return admins.has(email.toLowerCase());
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter api test -- admin.roles`
Expected: PASS, 6 tests.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/moderation/admin/admin.roles.ts apps/api/src/modules/moderation/admin/admin.roles.test.ts
git commit -m "feat(admin): modulo puro con las reglas de rol de usuario"
```

---

### Task 2: Migration y columna en el modelo

**Files:**
- Create: `apps/api/src/db/migrations/20260816100000-add-role-to-users.js`
- Modify: `apps/api/src/models/user.model.ts`

**Interfaces:**
- Consumes: `USER_ROLES` de Task 1 (solo como referencia del listado; la migration es JS y repite los valores).
- Produces: `User.role: UserRole` disponible en Sequelize.

- [ ] **Step 1: Escribir la migration**

```javascript
// apps/api/src/db/migrations/20260816100000-add-role-to-users.js
'use strict';

/**
 * Rol de usuario. Ver docs/superpowers/specs/2026-08-16-panel-admin-roles-design.md.
 *
 * El valor 'admin' es ETIQUETA, no permiso: quien entra al panel lo sigue
 * decidiendo la variable de entorno ADMIN_EMAILS. Si el permiso viviera aca, un
 * error editando la propia fila dejaria al unico admin afuera del panel.
 *
 * El backfill LEE is_vet y escribe role, nunca al reves: asi el down puede tirar
 * la columna sin dejar el booleano corrupto.
 */

const ROLES = ['comun', 'tester', 'voluntario', 'veterinario', 'admin'];

const list = (values) => values.map((v) => `'${v}'`).join(',');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('users', 'role', {
      type: Sequelize.TEXT,
      allowNull: false,
      defaultValue: 'comun',
    });
    await queryInterface.sequelize.query(`
      ALTER TABLE users
        ADD CONSTRAINT users_role_check CHECK (role IN (${list(ROLES)}));
    `);
    await queryInterface.sequelize.query(`
      UPDATE users SET role = 'veterinario' WHERE is_vet = true;
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      ALTER TABLE users DROP CONSTRAINT users_role_check;
    `);
    await queryInterface.removeColumn('users', 'role');
  },
};
```

- [ ] **Step 2: Verificar el SQL contra la base dentro de una transaccion**

Ejecutar con `mcp__supabase__execute_sql`. El MCP devuelve **solo el ultimo result set**, por eso los pasos se acumulan en una temp table.

```sql
BEGIN;
CREATE TEMP TABLE r(paso text, resultado text) ON COMMIT DROP;

ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'comun';
ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK (role IN ('comun','tester','voluntario','veterinario','admin'));
UPDATE users SET role = 'veterinario' WHERE is_vet = true;

INSERT INTO r SELECT 'veterinarios backfilleados',
  (SELECT COUNT(*)::text FROM users WHERE role = 'veterinario');
INSERT INTO r SELECT 'resto en comun',
  (SELECT COUNT(*)::text FROM users WHERE role = 'comun');

DO $$
BEGIN
  UPDATE users SET role = 'inexistente' WHERE id = (SELECT id FROM users LIMIT 1);
  INSERT INTO r VALUES ('CHECK rol invalido', 'NO REBOTO (mal)');
EXCEPTION WHEN check_violation THEN
  INSERT INTO r VALUES ('CHECK rol invalido', 'rebota, ok');
END $$;

ALTER TABLE users DROP CONSTRAINT users_role_check;
ALTER TABLE users DROP COLUMN role;
INSERT INTO r SELECT 'tras el down', COALESCE(
  (SELECT column_name FROM information_schema.columns
   WHERE table_name = 'users' AND column_name = 'role'), 'columna eliminada, ok');

SELECT * FROM r;
ROLLBACK;
```

Expected: `veterinarios backfilleados = 1`, `CHECK rol invalido = rebota, ok`, `tras el down = columna eliminada, ok`.

- [ ] **Step 3: Agregar la columna al modelo**

En `apps/api/src/models/user.model.ts`: importar el tipo, sumar `role: UserRole;` a `UserAttributes`, `| 'role'` a las claves opcionales de creacion, `declare role: UserRole;` a la clase, y al `init`:

```typescript
        role: {
          type: DataTypes.TEXT,
          allowNull: false,
          defaultValue: 'comun',
        },
```

El import va como `import type { UserRole } from '../modules/moderation/admin/admin.roles';`

- [ ] **Step 4: Verificar que compila**

Run: `pnpm --filter api typecheck`
Expected: sin errores.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/db/migrations/20260816100000-add-role-to-users.js apps/api/src/models/user.model.ts
git commit -m "feat(admin): columna role en users con CHECK espejo"
```

---

### Task 3: Listar y cambiar el rol desde el API

**Files:**
- Modify: `apps/api/src/modules/moderation/admin/admin.validators.ts`
- Modify: `apps/api/src/modules/moderation/admin/admin.service.ts`
- Modify: `apps/api/src/modules/moderation/admin/admin.controller.ts:50-72`
- Test: `apps/api/src/modules/moderation/admin/admin.integration.test.ts`

**Interfaces:**
- Consumes: `USER_ROLES`, `UserRole`, `isVetForRole`, `isAdminEmail` de Task 1; `users.role` de Task 2.
- Produces:
  - `AdminUserRow` suma `role: UserRole`
  - `patchAdminUser(userId: string, input: PatchAdminUserInput)` — **reemplaza a `banUser`**, mismo tipo de retorno `Promise<{ ok: true } | { error: { code, message, status } }>`

- [ ] **Step 1: Write the failing tests**

Agregar a `admin.integration.test.ts`, dentro del describe de `PATCH /api/v1/admin/users/:id`:

```typescript
  it('cambia el rol de un usuario', async () => {
    vi.mocked(svc.patchAdminUser).mockResolvedValueOnce({ ok: true });

    const res = await request(app)
      .patch('/api/v1/admin/users/user-uuid-2')
      .set('Authorization', adminAuthHeader)
      .send({ action: 'set_role', role: 'veterinario' });

    expect(res.status).toBe(204);
    expect(vi.mocked(svc.patchAdminUser)).toHaveBeenCalledWith('user-uuid-2', {
      action: 'set_role',
      role: 'veterinario',
    });
  });

  it('devuelve 400 si set_role viene sin rol', async () => {
    const res = await request(app)
      .patch('/api/v1/admin/users/user-uuid-2')
      .set('Authorization', adminAuthHeader)
      .send({ action: 'set_role' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('devuelve 400 con un rol que no existe', async () => {
    const res = await request(app)
      .patch('/api/v1/admin/users/user-uuid-2')
      .set('Authorization', adminAuthHeader)
      .send({ action: 'set_role', role: 'jefe' });

    expect(res.status).toBe(400);
  });

  it('devuelve 409 al intentar cambiarle el rol a un admin', async () => {
    vi.mocked(svc.patchAdminUser).mockResolvedValueOnce({
      error: { code: 'ADMIN_ROLE_LOCKED', message: 'No se puede cambiar el rol de un administrador', status: 409 },
    });

    const res = await request(app)
      .patch('/api/v1/admin/users/user-uuid-2')
      .set('Authorization', adminAuthHeader)
      .send({ action: 'set_role', role: 'comun' });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('ADMIN_ROLE_LOCKED');
  });
```

Nota: `adminAuthHeader` y el mock de `svc` ya existen en el fichero. Renombrar los mocks de `banUser` a `patchAdminUser` en los tests que ya estaban.

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter api test -- admin.integration`
Expected: FAIL — `svc.patchAdminUser is not a function`.

- [ ] **Step 3: Union discriminado en el validator**

En `admin.validators.ts`, reemplazar `patchAdminUserSchema`:

```typescript
import { USER_ROLES } from './admin.roles';

// Union discriminado: `role` es obligatorio cuando y solo cuando la accion es
// set_role. Con un objeto plano y `role` opcional, un set_role sin rol pasaria
// la validacion y reventaria abajo.
export const patchAdminUserSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('ban') }),
  z.object({ action: z.literal('unban') }),
  z.object({ action: z.literal('set_role'), role: z.enum(USER_ROLES) }),
]);
```

`z.enum` necesita un array de literales no vacio: `USER_ROLES` es `as const`, asi que tipa bien.

- [ ] **Step 4: Renombrar y extender el service**

En `admin.service.ts`:

1. Sumar `role` a `AdminUserRow`: `role: UserRole;`
2. En el SELECT de `listAdminUsers`, agregar `u.role,` despues de `u.name,`.
3. Renombrar `banUser` a `patchAdminUser` y sumar la rama de rol:

```typescript
export async function patchAdminUser(
  userId: string,
  input: PatchAdminUserInput,
): Promise<{ ok: true } | { error: { code: string; message: string; status: number } }> {
  const [user] = await sequelize.query<{ id: string; email: string }>(
    `SELECT id, email FROM users WHERE id = :userId`,
    { replacements: { userId }, type: QueryTypes.SELECT },
  );

  if (!user) {
    return { error: { code: 'USER_NOT_FOUND', message: 'Usuario no encontrado', status: 404 } };
  }

  if (input.action === 'set_role') {
    // La etiqueta no puede contradecir al permiso: quien entra al panel lo
    // decide ADMIN_EMAILS, no esta columna.
    if (isAdminEmail(user.email, process.env['ADMIN_EMAILS'])) {
      return {
        error: {
          code: 'ADMIN_ROLE_LOCKED',
          message: 'No se puede cambiar el rol de un administrador',
          status: 409,
        },
      };
    }
    await sequelize.query(
      `UPDATE users SET role = :role, is_vet = :isVet, updated_at = NOW() WHERE id = :userId`,
      {
        replacements: { role: input.role, isVet: isVetForRole(input.role), userId },
        type: QueryTypes.UPDATE,
      },
    );
    return { ok: true };
  }

  if (input.action === 'ban') {
    await sequelize.query(
      `UPDATE users SET banned_at = NOW() WHERE id = :userId`,
      { replacements: { userId }, type: QueryTypes.UPDATE },
    );
    await RefreshToken.destroy({ where: { userId } });
  } else {
    await sequelize.query(
      `UPDATE users SET banned_at = NULL WHERE id = :userId`,
      { replacements: { userId }, type: QueryTypes.UPDATE },
    );
  }

  return { ok: true };
}
```

Importar arriba: `import { isAdminEmail, isVetForRole, type UserRole } from './admin.roles';`

4. En `admin.controller.ts`, cambiar el import y la llamada de `banUser` a `patchAdminUser`.

- [ ] **Step 5: Run tests**

Run: `pnpm --filter api test -- admin.integration`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/modules/moderation/admin/
git commit -m "feat(admin): cambiar el rol de un usuario desde el panel"
```

---

### Task 4: Ficha de usuario en el API

**Files:**
- Modify: `apps/api/src/modules/moderation/admin/admin.service.ts`
- Modify: `apps/api/src/modules/moderation/admin/admin.controller.ts`
- Modify: `apps/api/src/modules/moderation/admin/admin.routes.ts`
- Test: `apps/api/src/modules/moderation/admin/admin.integration.test.ts`

**Interfaces:**
- Consumes: `UserRole` de Task 1.
- Produces:
  - `getAdminUserDetail(userId: string): Promise<AdminUserDetail | null>`
  - `interface AdminUserDetail { user: {...}; counts: { cases: number; contactsInitiated: number; contactsReceived: number }; recentCases: AdminUserCaseRow[] }`
  - Ruta `GET /api/v1/admin/users/:id`

- [ ] **Step 1: Write the failing test**

```typescript
describe('GET /api/v1/admin/users/:id', () => {
  it('devuelve la ficha del usuario', async () => {
    vi.mocked(svc.getAdminUserDetail).mockResolvedValueOnce({
      user: {
        id: 'user-uuid-2', email: 'vet@ejemplo.com', name: 'Vet', role: 'veterinario',
        isVet: true, vetLicense: 'MP-123', emailVerified: true, bannedAt: null,
        createdAt: new Date(),
      },
      counts: { cases: 3, contactsInitiated: 5, contactsReceived: 2 },
      recentCases: [
        { id: 'case-1', animalType: 'perro', status: 'abierto', createdAt: new Date() },
      ],
    });

    const res = await request(app)
      .get('/api/v1/admin/users/user-uuid-2')
      .set('Authorization', adminAuthHeader);

    expect(res.status).toBe(200);
    expect(res.body.user.role).toBe('veterinario');
    expect(res.body.counts.contactsReceived).toBe(2);
    expect(res.body.recentCases).toHaveLength(1);
  });

  it('devuelve 404 si el usuario no existe', async () => {
    vi.mocked(svc.getAdminUserDetail).mockResolvedValueOnce(null);

    const res = await request(app)
      .get('/api/v1/admin/users/no-existe')
      .set('Authorization', adminAuthHeader);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('USER_NOT_FOUND');
  });

  it('devuelve 403 si no es admin', async () => {
    const res = await request(app)
      .get('/api/v1/admin/users/user-uuid-2')
      .set('Authorization', authHeader);

    expect(res.status).toBe(403);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter api test -- admin.integration`
Expected: FAIL — `svc.getAdminUserDetail is not a function`.

- [ ] **Step 3: Implementar el service**

```typescript
export interface AdminUserCaseRow {
  id: string;
  animalType: string;
  status: string;
  createdAt: Date;
}

export interface AdminUserDetail {
  user: {
    id: string;
    email: string;
    name: string | null;
    role: UserRole;
    isVet: boolean;
    vetLicense: string | null;
    emailVerified: boolean;
    bannedAt: Date | null;
    createdAt: Date;
  };
  counts: { cases: number; contactsInitiated: number; contactsReceived: number };
  recentCases: AdminUserCaseRow[];
}

export async function getAdminUserDetail(userId: string): Promise<AdminUserDetail | null> {
  const [user] = await sequelize.query<AdminUserDetail['user']>(
    `SELECT id, email, name, role,
            is_vet AS "isVet", vet_license AS "vetLicense",
            email_verified AS "emailVerified", banned_at AS "bannedAt",
            created_at AS "createdAt"
     FROM users WHERE id = :userId`,
    { replacements: { userId }, type: QueryTypes.SELECT },
  );

  if (!user) return null;

  const [counts] = await sequelize.query<{
    cases: string; contactsInitiated: string; contactsReceived: string;
  }>(
    `SELECT
       (SELECT COUNT(*) FROM cases WHERE user_id = :userId) AS cases,
       (SELECT COUNT(*) FROM contacts WHERE initiator_id = :userId) AS "contactsInitiated",
       (SELECT COUNT(*) FROM contacts WHERE responder_id = :userId) AS "contactsReceived"`,
    { replacements: { userId }, type: QueryTypes.SELECT },
  );

  const recentCases = await sequelize.query<AdminUserCaseRow>(
    `SELECT id, animal_type AS "animalType", status, created_at AS "createdAt"
     FROM cases WHERE user_id = :userId
     ORDER BY created_at DESC LIMIT 5`,
    { replacements: { userId }, type: QueryTypes.SELECT },
  );

  return {
    user,
    counts: {
      cases: parseInt(counts.cases, 10),
      contactsInitiated: parseInt(counts.contactsInitiated, 10),
      contactsReceived: parseInt(counts.contactsReceived, 10),
    },
    recentCases,
  };
}
```

- [ ] **Step 4: Controller y ruta**

En `admin.controller.ts`:

```typescript
export const getUserDetail = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const detail = await getAdminUserDetail(req.params['id']!);
    if (!detail) {
      res.status(404).json({ error: { code: 'USER_NOT_FOUND', message: 'Usuario no encontrado' } });
      return;
    }
    res.json(detail);
  } catch (err) {
    next(err);
  }
};
```

En `admin.routes.ts`, **antes** de `adminRouter.patch('/users/:id', patchUser)`:

```typescript
adminRouter.get('/users/:id', getUserDetail);
```

- [ ] **Step 5: Run tests**

Run: `pnpm --filter api test -- admin.integration`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/modules/moderation/admin/
git commit -m "feat(admin): ficha de usuario con recuentos y casos recientes"
```

---

### Task 5: El perfil propio deja de escribir isVet

**Files:**
- Modify: `apps/api/src/modules/users/users.controller.ts:21-25,64-92`
- Test: `apps/api/src/modules/users/users.integration.test.ts`

**Interfaces:**
- Consumes: `isAdminEmail` de Task 1.
- Produces: nada nuevo. `PATCH /users/me` sigue devolviendo el mismo cuerpo.

- [ ] **Step 1: Write the failing test**

```typescript
  it('ignora isVet y vetLicense: el perfil propio ya no los escribe', async () => {
    const res = await request(app)
      .patch('/api/v1/users/me')
      .set('Authorization', authHeader)
      .send({ name: 'Nuevo nombre', isVet: true, vetLicense: 'MP-999' });

    expect(res.status).toBe(200);
    expect(res.body.isVet).toBe(false);
    expect(res.body.vetLicense).toBeNull();
  });
```

Ajustar el mock de `User.findByPk` de ese describe para que devuelva un usuario con `isVet: false, vetLicense: null` y un `save` espia.

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter api test -- users.integration`
Expected: FAIL — `expected true to be false`.

- [ ] **Step 3: Sacar los campos del schema y del write**

```typescript
// El rol lo otorga el panel de admin, no el propio usuario. isVet y vetLicense
// se IGNORAN en vez de rechazarse: durante la ventana de deploy el frontend
// viejo los sigue mandando y un 400 le romperia el guardado del perfil.
// Zod descarta las claves desconocidas por defecto, que es justo lo que hace
// falta: no hace falta .passthrough() ni .strip() explicito.
const patchMeSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
});
```

Y en `patchMe`, borrar las dos lineas:

```typescript
    if (input.isVet !== undefined) user.isVet = input.isVet;
    if (input.vetLicense !== undefined) user.vetLicense = input.vetLicense;
```

Reemplazar los dos usos de `isAdminEmail(user.email)` por `isAdminEmail(user.email, process.env['ADMIN_EMAILS'])` y borrar la funcion local `isAdminEmail` de las lineas 7-15, importando la de Task 1:

```typescript
import { isAdminEmail } from '../moderation/admin/admin.roles';
```

- [ ] **Step 4: Run tests**

Run: `pnpm --filter api test`
Expected: PASS, toda la suite.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/users/
git commit -m "feat(users): el perfil propio deja de escribir isVet"
```

---

### Task 6: Chip de rol en la lista de usuarios

**Files:**
- Modify: `apps/web/src/services/admin.service.ts`
- Modify: `apps/web/src/pages/AdminPage.tsx`

**Interfaces:**
- Consumes: `role` en la respuesta de `GET /admin/users` (Task 3).
- Produces:
  - `type UserRole` en `admin.service.ts`
  - `const ROLE_LABELS: Record<UserRole, string>` y `ROLE_CHIP: Record<UserRole, string>` en `AdminPage.tsx`
  - `setAdminUserRole(userId: string, role: UserRole): Promise<void>`

- [ ] **Step 1: Tipos y llamada en el service**

En `apps/web/src/services/admin.service.ts`:

```typescript
export type UserRole = 'comun' | 'tester' | 'voluntario' | 'veterinario' | 'admin'
```

Sumar `role: UserRole` a la interface `AdminUser`, y:

```typescript
export const setAdminUserRole = async (userId: string, role: UserRole): Promise<void> => {
  await api.patch(`/admin/users/${userId}`, { action: 'set_role', role })
}
```

- [ ] **Step 2: Chip en la fila**

En `AdminPage.tsx`, junto a los otros `Record` de labels:

```typescript
const ROLE_LABELS: Record<UserRole, string> = {
  comun: 'Común',
  tester: 'Tester',
  voluntario: 'Voluntario',
  veterinario: 'Veterinario',
  admin: 'Admin',
}

// El violeta es el color de marca y se reserva para admin. Veterinario va en
// teal, que es el color que el timeline ya usa para las atenciones.
const ROLE_CHIP: Record<UserRole, string> = {
  comun: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
  tester: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  voluntario: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  veterinario: 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300',
  admin: 'bg-primary-100 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300',
}
```

Renderizar en la fila de usuario, al lado del nombre:

```tsx
<span className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${ROLE_CHIP[u.role]}`}>
  {ROLE_LABELS[u.role]}
</span>
```

- [ ] **Step 3: Verificar**

Run: `pnpm --filter web typecheck && pnpm --filter web lint`
Expected: sin errores.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/services/admin.service.ts apps/web/src/pages/AdminPage.tsx
git commit -m "feat(web): chip de rol en la lista de usuarios del panel"
```

---

### Task 7: Fila expandida con la ficha

**Files:**
- Modify: `apps/web/src/services/admin.service.ts`
- Modify: `apps/web/src/pages/AdminPage.tsx`

**Interfaces:**
- Consumes: `GET /admin/users/:id` (Task 4), `setAdminUserRole` (Task 6).
- Produces: `getAdminUserDetail(userId: string): Promise<AdminUserDetail>` y el estado `expandedUserId` en `AdminPage`.

- [ ] **Step 1: Tipo y llamada**

```typescript
export interface AdminUserDetail {
  user: AdminUser & { vetLicense: string | null; isVet: boolean }
  counts: { cases: number; contactsInitiated: number; contactsReceived: number }
  recentCases: { id: string; animalType: string; status: string; createdAt: string }[]
}

export const getAdminUserDetail = async (userId: string): Promise<AdminUserDetail> => {
  const res = await api.get<AdminUserDetail>(`/admin/users/${userId}`)
  return res.data
}
```

- [ ] **Step 2: Estado y carga**

En `AdminPage.tsx`:

```typescript
const [expandedUserId, setExpandedUserId] = useState<string | null>(null)
const [userDetail, setUserDetail] = useState<AdminUserDetail | null>(null)
const [loadingDetail, setLoadingDetail] = useState(false)

const toggleUserRow = (userId: string) => {
  if (expandedUserId === userId) {
    setExpandedUserId(null)
    setUserDetail(null)
    return
  }
  setExpandedUserId(userId)
  setUserDetail(null)
  setLoadingDetail(true)
  getAdminUserDetail(userId)
    .then(setUserDetail)
    .catch(() => toast.error('No se pudo cargar la ficha.'))
    .finally(() => setLoadingDetail(false))
}
```

- [ ] **Step 3: Cambio de rol**

```typescript
const handleRoleChange = async (userId: string, role: UserRole) => {
  try {
    await setAdminUserRole(userId, role)
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role } : u)))
    setUserDetail((prev) =>
      prev && prev.user.id === userId
        ? { ...prev, user: { ...prev.user, role, isVet: role === 'veterinario' } }
        : prev,
    )
    toast.success('Rol actualizado.')
  } catch (err) {
    const code = (err as { response?: { data?: { error?: { code?: string } } } })
      .response?.data?.error?.code
    toast.error(
      code === 'ADMIN_ROLE_LOCKED'
        ? 'No se puede cambiar el rol de un administrador.'
        : 'No se pudo actualizar el rol.',
    )
  }
}
```

- [ ] **Step 4: El bloque expandido**

Debajo de cada fila de usuario, cuando `expandedUserId === u.id`:

```tsx
{expandedUserId === u.id && (
  <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 flex flex-col gap-3">
    {loadingDetail || !userDetail ? (
      <p className="text-sm text-gray-500 dark:text-gray-400">Cargando ficha...</p>
    ) : (
      <>
        <div className="flex flex-wrap gap-4 text-sm">
          <span className="text-gray-600 dark:text-gray-300">
            Casos: <strong>{userDetail.counts.cases}</strong>
          </span>
          <span className="text-gray-600 dark:text-gray-300">
            Solicitudes enviadas: <strong>{userDetail.counts.contactsInitiated}</strong>
          </span>
          <span className="text-gray-600 dark:text-gray-300">
            Recibidas: <strong>{userDetail.counts.contactsReceived}</strong>
          </span>
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor={`role-${u.id}`} className="text-sm text-gray-600 dark:text-gray-300">
            Rol
          </label>
          <select
            id={`role-${u.id}`}
            value={userDetail.user.role}
            onChange={(e) => handleRoleChange(u.id, e.target.value as UserRole)}
            className="rounded-lg border border-gray-300 dark:border-gray-600 px-2 py-1 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          >
            {(Object.keys(ROLE_LABELS) as UserRole[]).map((r) => (
              <option key={r} value={r}>{ROLE_LABELS[r]}</option>
            ))}
          </select>
          {userDetail.user.vetLicense && (
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Mat. {userDetail.user.vetLicense}
            </span>
          )}
        </div>

        {userDetail.recentCases.length > 0 && (
          <div className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Casos recientes
            </span>
            {userDetail.recentCases.map((c) => (
              <Link
                key={c.id}
                to={`/cases/${c.id}`}
                className="text-sm text-primary-600 dark:text-primary-300 hover:underline"
              >
                {c.animalType} — {STATUS_LABELS[c.status] ?? c.status}
              </Link>
            ))}
          </div>
        )}

        <Link
          to={`/users/${u.id}`}
          className="text-sm text-primary-600 dark:text-primary-300 hover:underline self-start"
        >
          Ver perfil público
        </Link>
      </>
    )}
  </div>
)}
```

La ruta del perfil publico es `users/:id` (`apps/web/src/router/index.tsx:29`).

El nombre del usuario en la fila pasa a ser un `<button type="button" onClick={() => toggleUserRow(u.id)}>` para que la expansion sea accesible por teclado.

- [ ] **Step 5: Verificar**

Run: `pnpm --filter web typecheck && pnpm --filter web lint`
Expected: sin errores.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/services/admin.service.ts apps/web/src/pages/AdminPage.tsx
git commit -m "feat(web): ficha de usuario expandible en el panel de admin"
```

---

### Task 8: El perfil propio muestra el veterinario en solo lectura

**Files:**
- Modify: `apps/web/src/pages/ProfilePage.tsx:44,89-90,168-220`

**Interfaces:**
- Consumes: `PATCH /users/me` ya no escribe `isVet` (Task 5).
- Produces: nada.

- [ ] **Step 1: Sacar el checkbox del formulario**

Borrar los estados `isVetInput` / `vetLicenseInput`, el checkbox y el input de matricula del modo edicion, y los campos `isVet` / `vetLicense` del payload que manda `updateMe`.

- [ ] **Step 2: Mostrarlo en solo lectura**

Donde estaba el checkbox, en modo edicion y en modo lectura por igual:

```tsx
{user?.isVet && (
  <div className="flex items-center gap-2">
    <span className="text-sm text-teal-600 dark:text-teal-400">✓ Profesional verificado</span>
    {user.vetLicense && (
      <span className="text-xs text-gray-500 dark:text-gray-400">Mat. {user.vetLicense}</span>
    )}
  </div>
)}
<p className="text-xs text-gray-500 dark:text-gray-400">
  La verificación como profesional la otorga el equipo. Escribinos si sos veterinario.
</p>
```

- [ ] **Step 3: Verificar**

Run: `pnpm --filter web typecheck && pnpm --filter web lint`
Expected: sin errores.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/pages/ProfilePage.tsx
git commit -m "feat(web): la verificacion de veterinario deja de ser autoservicio"
```

---

## Cierre

- [ ] `pnpm --filter api test` — toda la suite en verde.
- [ ] `pnpm --filter api typecheck && pnpm --filter api lint`
- [ ] `pnpm --filter web typecheck && pnpm --filter web lint`
- [ ] **Aplicar la migration en prod ANTES de mergear**, via `mcp__supabase__apply_migration`, e insertar la fila en `SequelizeMeta`:

```sql
INSERT INTO "SequelizeMeta" (name)
VALUES ('20260816100000-add-role-to-users.js') ON CONFLICT DO NOTHING;
```

- [ ] Abrir el PR contra `main` (squash merge; no hay push directo a main).
