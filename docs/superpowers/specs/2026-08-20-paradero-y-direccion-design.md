# Paradero del animal y entrada de direccion

Fecha: 2026-08-20
Estado: aprobado, listo para plan de implementacion

## Contexto

El disparador fueron tres notas de la bandeja de mejoras del 20/08, las tres en
`/cases/new`:

1. "sigue bug con la direccion"
2. "cuando pongo localidad no se abre el tooltip para seleccionar el nombre real"
3. "Puse Calle: Avenida Alem / Numero: 850, eso deberia bastar para que
   automaticamente se ubique el mapa"

Empezaron como un bug y terminaron siendo dos problemas de modelo. Este spec
cubre los dos.

## Parte 1 — El paradero del animal

### El problema

El caso tiene **una** ubicacion y es ambigua: no distingue *donde viste al
animal* de *donde esta ahora*. Cuando alguien encuentra un animal y se lo lleva
a su casa, el pin queda igual y el mapa pasa a mostrar animales que ya estan a
salvo mezclados con animales que siguen en la calle.

Corolario de privacidad: si en algun momento la ubicacion pasara a significar
"donde esta ahora", el sistema estaria publicando el domicilio de quien rescato.

### La decision

**La ubicacion del caso es siempre donde se vio al animal, nunca donde esta
ahora.** El domicilio de quien rescata no se pide, no se geocodifica y no entra
al sistema. La privacidad deja de ser una regla que hay que acordarse de aplicar
y pasa a ser una consecuencia del modelo.

### `listing_type` mezclaba dos ejes

`at_risk` entro en S2 (PR #126) como tercer tipo de publicacion, pero "en
riesgo" es una calificacion **del estado del animal**, no del tipo de
publicacion:

- Eje 1, que paso: lo encontre / se me perdio
- Eje 2, como esta: en riesgo, herido, sano

El eje 2 ya existe y esta poblado: `animal_condition` (herido, sano, asustado,
debil, no_pude_acercarme) y `urgency_level`.

Y una vez sacado del medio, **"Vi un animal en riesgo" y "Lo encontre" no son
dos tipos: son la misma cosa con distinto paradero.** Las dos son "me cruce con
un animal"; la diferencia es si te lo llevaste o lo dejaste donde estaba.

### El modelo resultante

```
listing_type   found  "Me cruce con un animal"
               lost   "Busco a mi animal"
               at_risk  ← se retira

paradero       en_la_calle          sigue donde lo vi
               con_quien_publica    me lo lleve
               con_un_tercero       se lo di a alguien
               desconocido          implicito en los 'lost'

"en riesgo"    = urgency_level + animal_condition
```

- El paradero se pregunta **solo** en `found`. En `lost` es `desconocido` y no
  se muestra la pregunta.
- **A resguardo** = `con_quien_publica` o `con_un_tercero`. Es lo unico que mira
  el filtro del mapa.
- Un animal buscado, uno en riesgo y uno que sigue tirado en la calle, los tres
  necesitan ayuda y los tres quedan en la vista por defecto del mapa.

### Costo de retirar `at_risk`

Verificado contra Postgres de produccion el 20/08:

| listing_type | casos |
|---|---|
| found | 20 |
| lost | 2 |
| **at_risk** | **0** |

Nadie lo uso nunca. No hay backfill ni filas ambiguas: es codigo mas una CHECK.
El costo no vuelve a ser tan bajo.

### El pin del mapa no pierde nada

`LeafletMap.tsx:21-24` pinta el **relleno por urgencia** y el **borde por
listing type**. Un caso urgencia 5 ya sale rojo sin necesidad de `at_risk`.

Retirarlo ademas libera el borde para codificar **paradero** (a resguardo / en
la calle / buscado), que es el eje accionable.

### Efectos en la UI

- El wizard pregunta el paradero solo en la rama "Me cruce con un animal".
- Si el paradero no es `en_la_calle`, el wizard crea la primera novedad de tipo
  `alojamiento` con el nombre de quien lo tiene. Ese tipo de novedad y su campo
  `hostName` **ya existen** (`CaseTimeline.tsx:337`); no se inventa nada y el
  historial arranca contando la verdad desde el minuto cero.
- El mapa filtra por "a resguardo" y arranca escondiendolos, con un toggle
  para mostrarlos. **Los pines no se borran**: se quedan en el lugar del
  hallazgo, que es el dato que le sirve al dueño de un animal perdido para
  reconocerlo.
- El borde del pin pasa a codificar paradero en vez de tipo.

### Migration: van dos, y en este orden

**Dev y prod comparten la base de Supabase.** Una migration destructiva tira
prod aunque el codigo nuevo este bien, porque el codigo viejo sigue corriendo
hasta que Render termina de deployar. Ese fue el incidente del 20/08.

Aca hay una trampa concreta: **quitar `at_risk` de la CHECK no es seguro
mientras el build viejo siga sirviendose.** Ninguna fila existente viola la
CHECK nueva —hay cero `at_risk`—, pero un usuario con el bundle viejo cargado
que elija "Vi un animal en riesgo" recibe un 500 al publicar. Es exactamente el
patron de `db_check_constraints_vs_zod`, al reves: el enum de Zod es mas ancho
que la CHECK.

Por eso se parte en dos:

**Migration A — antes del deploy, aditiva y sin riesgo**
- Agregar `paradero` con default `en_la_calle` y su CHECK.
- Backfill: `found` → `en_la_calle`, `lost` → `desconocido`. Es el default
  honesto y el que la app ya asume hoy.
- `listing_type` no se toca: `at_risk` sigue permitido en la base.

**Migration B — despues de que el deploy este verificado en produccion**
- Rehacer la CHECK de `listing_type` sin `at_risk`.

Entre A y B la base acepta un valor que la UI ya no ofrece. Es el estado
correcto: tolerante con lo viejo, estricto recien cuando lo viejo no existe.

## Parte 2 — La entrada de direccion

### Lo que se encontro

Medido contra la API real de Nominatim, la misma que usa el wizard:

```
"Avenida Alem 850, Salto, Argentina"
  → 850, Avenida Alem, Almafuerte, CORDOBA     (otra provincia, ~600 km)
"San Martin 1234, Pehuajo, Argentina"
  → San Martin, Pehuajo  (type: track)          (el numero se ignora)
```

| # | Causa | Consecuencia |
|---|---|---|
| 1 | La localidad viaja como texto dentro del query | Nominatim la ignora y el pin aterriza en otra provincia |
| 2 | `LocalidadAutocomplete` se usa sin `onSelect` (`PublishCasePage.tsx:807`) | Se descartan las coordenadas que Nominatim ya dio y se regeocodifica el string |
| 3 | Un `fetch` por tecla en localidad (`PublishCasePage.tsx:662`, sin debounce) | Nominatim corta por cuota y el desplegable queda vacio en silencio |
| 4 | Los numeros de casa no existen en OSM en el interior | La precision que se pide no se puede cumplir |
| 5 | Fallar es un callejon sin salida | "No encontramos esa direccion" y el usuario se queda sin pin |
| 6 | Hay que apretar "Buscar direccion" | El usuario espera que sea automatico |

La causa 3 es la explicacion mas probable de la nota 2 de la bandeja: el
desplegable no se abre porque nos autobloqueamos pidiendo demasiado.

La causa 1 con `limit=1` es la nota 1: no es que no encuentre, es que encuentra
**con seguridad** un lugar equivocado.

### El principio

**La localidad es un ancla, no un string.**

Al elegir una localidad de la lista, Nominatim ya devuelve coordenadas **y un
`boundingbox`**. Se guardan los dos y todo lo que sigue queda encerrado ahi
(`viewbox` + `bounded=1`). El pin en otra provincia deja de ser posible por
construccion, no por validacion.

### El flujo

1. **Localidad** — se elige de la lista. El mapa aparece ahi al instante. Ese
   texto no se vuelve a geocodificar nunca.
2. **Calle** *(opcional)* — autocompletado acotado a esa caja. Al elegirla, el
   mapa se mueve y hace zoom sobre la calle.
3. **Numero** *(opcional, es una pista)* — si OSM lo tiene, afina; si no, se
   ignora sin decir nada. **Nunca es un error.**
4. **El pin siempre existe y se arrastra.** Es la fuente de verdad; geocodificar
   solo lo acerca.

Se retira el boton "Buscar direccion": resuelve a medida que se elige.

### Lo que se retira

- **El modo Interseccion y con el Overpass.** El mirror ya era inestable
  y con calle + mapa la interseccion se resuelve
  arrastrando el pin dos cuadras. El "entre Sarmiento y Rivadavia" pasa a
  `reference_note`, que ya existe en el modelo y es texto para humanos, no para
  geocodificar.
- **La obligacion del numero.** Copy nuevo: *"Marca la cuadra, no hace falta que
  sea exacto."* Es la verdad tecnica y ademas protege a quien encontro al animal
  en su propia puerta.

### Precision del pin: no se redondea

Decidido explicitamente: **nada de desenfoque artificial.** El pin lo coloca la
persona arrastrandolo, el zoom por defecto aterriza a nivel calle y el copy pide
la cuadra. Para marcar la propia puerta hay que quererlo. Inventar un radio de
blur es complejidad que no pidio nadie.

## Fuera de alcance

- El rediseño de la pantalla Reportar (es S6).
- Los otros items de la bandeja de mejoras (grupos B, C y D).
- Los ~20 titulos backfilleados que dicen "Perro" (sesion 20/08).
- Cualquier cambio al flujo de voluntarios (S3).

## Testing

`apps/web` tiene vitest desde S0.

- Construccion de queries a Nominatim: que el `viewbox` se aplique, que
  `bounded=1` viaje, que la ausencia de numero no rompa la query.
- Derivacion del paradero por `listing_type`: que `lost` de `desconocido` sin
  preguntar, que `found` exija respuesta.
- Que "a resguardo" sea exactamente los dos valores del medio.
- El arrastre del pin y el zoom sobre la calle se verifican a mano.
