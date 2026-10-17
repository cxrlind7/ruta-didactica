# Ruta Didáctica

Tienda de material didáctico para docentes de primaria (ciclo 2026-2027). Se compra por
**grado** (1–6) × **cobertura** (quincena, mes, trimestre, ciclo) × **ruta** (Base, Visual,
Seguimiento, Integral) × un periodo concreto (`T1_Q01`, `T1_M01`, `T1`, `CICLO`), y lo
comprado se descarga desde la biblioteca, sellado con los datos del comprador.

Next.js 16 (App Router) · React 19 · Prisma 7 + PostgreSQL · Mercado Pago · Railway.

> Esta versión de Next.js tiene cambios importantes respecto a versiones anteriores; ver
> `AGENTS.md` antes de tocar código.

## Correr en local

```bash
npm install
npx prisma generate
npx prisma db push      # aplica el schema a DATABASE_URL
npm run dev
```

Variables de entorno (en `.env` o en Railway):

| Variable | Para qué |
|---|---|
| `DATABASE_URL` | PostgreSQL |
| `SESSION_SECRET` | Firma de las cookies de sesión (`rd_session`) y de invitado (`rd_guest`) |
| `MP_ACCESS_TOKEN_TEST` / `MP_PUBLIC_KEY_TEST` / `MP_WEBHOOK_SECRET_TEST` | App de Mercado Pago de **prueba** |
| `MP_ACCESS_TOKEN_PROD` / `MP_PUBLIC_KEY_PROD` / `MP_WEBHOOK_SECRET_PROD` | App de Mercado Pago de **producción** |

Prueba y producción son dos aplicaciones de Mercado Pago distintas (ver
`src/lib/mercadopago.ts`). El modo activo se cambia desde `/admin/pagos` y se guarda en la
base (`AppSettings`), no en una variable de entorno.

## Deploy

Railway corre `npm run build` y luego `npm start`, que hace `prisma db push && next start`.
Si un cambio de schema borraría datos (quitar una columna o tabla con información), el push
**falla a propósito** y el deploy no arranca: hay que revisar el cambio y aplicarlo a mano.

Los archivos del material viven en el volumen de Railway montado en `/data`
(`ArchivoDrive.path` es relativo a esa raíz).

## Cómo funciona

- **Compra:** `/planes` (wizard) → `/carrito` → `/checkout` → `/confirmacion`.
  - Modo prueba: tarjeta con el Brick de Mercado Pago → `/api/checkout` (API de Orders).
  - Modo producción: link de pago por pedido (Checkout Pro) → `/api/checkout/link`; tarjeta
    solo si el admin activó `permitirTarjetaProduccion`.
  - El webhook (`/api/webhooks/mercadopago`) aprueba el pedido y crea los `Entitlement`
    (`src/lib/grantEntitlements.ts`). El admin también puede confirmar a mano.
- **Cuentas:** comprar sin sesión no abre una sesión; deja un permiso de invitado ligado a
  ese pedido, para crear la contraseña desde `/confirmacion` cuando el pago se aprueba. Si el
  correo ya tiene contraseña, hay que iniciar sesión para comprar (`src/lib/buyer.ts`).
- **Doble cobro:** no se puede comprar lo que ya está incluido en una compra aprobada
  (`entitlementIncludes` en `src/lib/motorReglas.ts`).
- **Acceso al material:** `src/lib/motorReglas.ts` decide qué desbloquea cada compra (la ruta
  define los tipos de archivo, la cobertura los periodos, y nada se abre antes de
  `publicarEl`). `src/lib/bibliotecaTree.ts` arma la biblioteca con las mismas reglas.
- **Precios:** salen de `PaymentProduct` (16 productos, editables en `/admin/pagos`). Los de
  `src/lib/data.ts` solo se usan en la portada si falta un producto en la base.

## Datos

- `Publicacion`: espejo de la hoja `05_Matriz_Web` del Directorio de Publicaciones.
- `ArchivoDrive`: archivos físicos (incluye los agregados a mano en `/admin`).
- `PaymentProduct`, `Order`, `OrderItem`, `Entitlement`, `User`, `AppSettings`.

## Scripts (se corren a mano, no son parte del deploy)

Los `.ts` con `npx tsx scripts/<script>.ts`; el `.py` con `python`.

| Script | Qué hace |
|---|---|
| `scripts/export-matriz.py` | Exporta la matriz del Excel a `data/matriz-web.json` |
| `scripts/seed-matriz.ts` | Siembra `Publicacion` + `ArchivoDrive` desde ese JSON |
| `scripts/audit-archivos.ts` | Solo lectura: cruza los nombres de la matriz con los archivos reales |
| `scripts/ingest-archivos.ts` | Sube los archivos ubicados al volumen de Railway |
| `scripts/seed-payment-products.ts` | Siembra los 16 productos de pago (`--force` sobrescribe precios) |
| `scripts/create-admin.ts` | Crea o promueve un admin: `<email> <password>` |
| `scripts/backfill-entitlements.ts` | Rellena datos de compra en entitlements viejos |

`docs/` guarda documentos de referencia del negocio y de identidad visual.
