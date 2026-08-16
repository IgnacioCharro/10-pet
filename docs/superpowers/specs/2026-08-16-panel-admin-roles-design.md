# Panel de admin: roles de usuario y ficha por usuario

Fecha: 2026-08-16
Origen: items 1 y 3 de la bandeja de mejoras (`/admin`, anotados el 15/08).

> "Me gustaria que desde el panel de admin/usuarios se pueda interactuar con cada
> usuario. El unico boton que existe es banear."
>
> "los usuarios en esta lista deberian tener un indicativo de a que tier pertenecen:
> Admin? Veterinario? Voluntario? Tester? Comun?"

## El punto de partida no es el que sugiere el pedido

No hay ningun sistema de roles que mostrar. Hoy:

- **Admin** se resuelve por la variable de entorno `ADMIN_EMAILS`
  (`middleware/require-admin.ts`). No hay columna en `users`.
- **Veterinario** es el booleano `users.is_vet`, y es **autodeclarado**: cualquiera
  se lo pone editando su propio perfil (`users.controller.ts`, `patchMeSchema`), y el
  timeline del caso le pinta un ✓ con el tooltip "Profesional verificado".
- **Tester** y **voluntario** no existen en ninguna parte.

Asi que esto no es exponer un dato: es crear el modelo. Y de paso cierra el unico
agujero de confianza real que hay: el ✓ de profesional.

Al 16/08 la base tiene 8 usuarios, 1 con `is_vet`, 0 baneados.

## Decisiones

### El permiso de admin NO se muda a la base

La columna `role` acepta el valor `admin`, pero es **etiqueta, no permiso**. Quien
entra al panel lo sigue decidiendo `ADMIN_EMAILS`.

**Por que:** si el permiso viviera en la base, un error editando la propia fila deja
al unico admin afuera del panel, sin forma de volver salvo entrar por SQL. El env es
un canal de recuperacion que no depende de la app.

**Consecuencia que hay que manejar:** los dos canales pueden divergir. Se resuelve
prohibiendo cambiar el rol de un email que este en `ADMIN_EMAILS` (409), de modo que
la etiqueta nunca contradiga al permiso.

### `veterinario` es el unico rol que cambia comportamiento

- `role = 'veterinario'` ⟹ `is_vet = true`. Cualquier otro rol ⟹ `is_vet = false`.
- `PATCH /users/me` deja de escribir `isVet` y `vetLicense`: el unico que los mueve
  pasa a ser el panel, via el rol.

`is_vet` **no se borra**: lo leen `vet-assistances.service.ts` y el timeline. Pasa a
ser un campo derivado del rol, escrito solo por el panel. Sacarlo es una limpieza
posterior, no parte de esto.

### `tester` y `voluntario` son etiquetas y nada mas

No se les cuelga ninguna capacidad en este trabajo. Habilitar features ocultas para
testers, o capacidades de rescate para voluntarios, es producto y merece su propio
ciclo. Meterlo aca convertiria un cambio acotado en dos semanas.

## Modelo de datos

Migration `add-role-to-users`:

```sql
ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'comun';
ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK (role IN ('comun','tester','voluntario','veterinario','admin'));
UPDATE users SET role = 'veterinario' WHERE is_vet = true;
```

El CHECK es la convencion del repo: cada `z.enum` tiene su espejo en Postgres, y
sumar un valor solo en Zod hace que el insert rebote contra el constraint (ver
`20260814100000-update-case-update-types.js` y la memoria
`db_check_constraints_vs_zod`).

El `down` quita constraint y columna. `is_vet` no se toca en ninguna direccion: el
backfill lo lee, no lo escribe, asi que revertir no pierde nada.

## API

| Endpoint | Cambio |
|---|---|
| `GET /admin/users` | suma `role` a cada fila |
| `PATCH /admin/users/:id` | suma `{ action: 'set_role', role }` a los `ban`/`unban` que ya acepta |
| `GET /admin/users/:id` | **nuevo**: alimenta la ficha |
| `PATCH /users/me` | **deja de escribir** `isVet` y `vetLicense` (ver ventana de deploy en Riesgos) |

`PATCH /admin/users/:id` sigue siendo el unico endpoint de acciones sobre un usuario;
no se abre un `/role` aparte. El validator pasa a ser un union discriminado por
`action`, para que `role` sea obligatorio cuando y solo cuando `action` es
`set_role`.

`GET /admin/users/:id` devuelve:

```json
{
  "user": { "id": "...", "email": "...", "name": "...", "role": "comun",
            "isVet": false, "vetLicense": null,
            "emailVerified": true, "bannedAt": null, "createdAt": "..." },
  "counts": { "cases": 3, "contactsInitiated": 5, "contactsReceived": 2 },
  "recentCases": [{ "id": "...", "animalType": "perro", "status": "abierto",
                    "createdAt": "..." }]
}
```

Los dos recuentos de contactos salen de `contacts.initiator_id` y
`contacts.responder_id`. `recentCases` son los 5 mas recientes.

### Reglas que viven en el service, no en la UI

1. **rol ⟺ `is_vet`.** Setear el rol escribe el booleano en la misma operacion.
2. **Email en `ADMIN_EMAILS` es intocable.** `set_role` sobre el devuelve 409
   `ADMIN_ROLE_LOCKED`.

Las dos son de negocio y tienen que rebotar aunque la request no venga del panel.

## UI

Solapa **Usuarios**:

- Columna de rol: un chip por rol, junto a los estados que ya se muestran (baneado,
  sin verificar).
- Clic en la fila **la expande in-place**. No un modal: el panel ya usa expansion en
  la solapa de reportes, y un modal aca pelearia con el z-index que ya dio problemas
  (ver PR #37).
- Dentro de la fila expandida: los tres recuentos, los casos recientes con link a
  `/cases/:id`, link al perfil publico, un `<select>` de rol que guarda al cambiar, y
  el boton de ban que ya existe.

`ProfilePage.tsx` pierde el checkbox de veterinario y la matricula editable; pasa a
mostrarlos en modo lectura.

## Testing

El problema conocido del repo: las suites de integracion mockean el servicio y
`../../../db`, asi que **ningun test ejecuta SQL**. Hacen falta los dos remedios:

1. **Modulo puro con tests** (`admin.roles.ts`), como `cases.ordering.ts`: la regla
   rol⟺`is_vet` y la de admin protegido, con sus tests unitarios.
2. **La migration ejecutada contra Supabase dentro de `BEGIN; ... ROLLBACK;`** via
   MCP: up, backfill del veterinario existente, rechazo de un rol invalido por el
   CHECK, y down.

Mas los tests de integracion de siempre para las rutas nuevas (forma de la respuesta,
401/403, 409 del admin protegido, 400 de validacion).

## Fuera de alcance

- `vet-assistances` y el ✓ del timeline (siguen leyendo `is_vet`, que ahora es
  confiable; no cambia su codigo).
- Flujo de voluntarios.
- Cualquier feature detras de `tester`.
- Borrar `is_vet` de la tabla.

## Riesgos

- **Divergencia rol/env.** Mitigada por el 409, pero si alguien edita `ADMIN_EMAILS`
  en Render y no la fila, la etiqueta queda vieja. Es aceptable: la etiqueta no da
  permisos.
- **La migration corre en prod a mano.** El API no corre migrations al desplegar
  (`start` es `node dist/index.js`). Hay que aplicarla **antes** de mergear, con su
  fila en `SequelizeMeta`.
- **`PATCH /users/me` deja de aceptar campos que el frontend vivo todavia manda.**
  Durante la ventana de deploy, un perfil guardado desde la version vieja recibiria
  400. Se evita haciendo que el schema **ignore** `isVet`/`vetLicense` en vez de
  rechazarlos: se sacan del tipo y no se escriben, pero no rompen la request.
