# Plan: ventas de prueba con Mercado Pago + descarga protegida

## Diagnóstico del estado actual (`ruta-1-demo`)

- Proyecto Next.js (App Router) puramente frontend: carrito, "checkout" y login viven en `localStorage` (`src/lib/store.tsx`).
- No existe ninguna API route (`src/app/api/...` no existe) ni base de datos.
- El checkout (`src/app/checkout/page.tsx`) es simulado: un `setTimeout` marca la compra como hecha, sin pago real.
- La "descarga" en `src/app/biblioteca/page.tsx` genera un `.txt` en el navegador con `Blob` — no hay archivo real ni control de acceso.
- No hay `.env` ni SDK de Mercado Pago instalado.
- Para vender de verdad (aunque sea en modo prueba) y proteger un archivo descargable, hace falta backend: quién crea la orden, quién recibe la confirmación de pago (webhook) y quién decide si un usuario puede descargar el archivo.

## Decisiones ya tomadas

| Pieza | Elección |
|---|---|
| Hosting/DB | Railway (proyecto existente: `https://railway.com/project/7d8b8661-42cc-45ae-b90d-1e4a4965eb89`) + plugin de **PostgreSQL** de Railway |
| ORM | Prisma |
| Pagos | Mercado Pago Checkout API (API de Orders), credenciales **de prueba** |
| Webhook | Apunta directo al dominio público que asigna Railway — no hace falta ngrok |
| Login | Magic link por correo (sin contraseñas), cookie de sesión httpOnly |
| Envío de correo | Resend (o el proveedor SMTP que se prefiera) |
| Archivo protegido | PDF placeholder inicial, servido fuera de `public/` vía `GET /api/download/[itemId]` con verificación de sesión + compra |

## Fases

**Fase 0 — Cuenta y credenciales de Mercado Pago**
Crear la aplicación en Mercado Pago Developers (Pagos online → Checkout API → API de Orders), tomar `Public Key` y `Access Token` de prueba, y crear 2 usuarios de prueba (vendedor y comprador) desde el panel.

**Fase 1 — Backend mínimo en el mismo proyecto Next.js**
Agregar `src/app/api/*`:
- `POST /api/orders` → crea la orden en Mercado Pago (API de Orders) usando el Access Token en el servidor.
- `POST /api/webhooks/mercadopago` → recibe la notificación de pago, valida la firma, confirma el estado y otorga el derecho de descarga (entitlement).
- Persistencia con Prisma + Postgres (Railway): tablas `users`, `orders`, `entitlements`.

**Fase 2 — Checkout real**
Reemplazar el `setTimeout` simulado por: crear la orden en el servidor → redirigir al `init_point` de Mercado Pago (o Checkout Bricks) → pago con usuario/tarjeta de prueba.

**Fase 3 — Confirmación fiable vía webhook**
El acceso a la descarga se otorga cuando llega el webhook aprobado, no cuando el navegador vuelve a `/confirmacion` (el usuario puede cerrar la pestaña antes).

**Fase 4 — Archivo protegido**
- Sacar el archivo real de `public/` (todo ahí se sirve sin control).
- Guardarlo en carpeta privada del servidor o storage privado.
- `GET /api/download/[itemId]`: verifica sesión → verifica `entitlement` aprobado para ese usuario+producto → streaming del archivo o URL firmada de corta duración.

**Fase 5 — Login real mínimo**
Magic link por correo: el usuario pone su email, recibe un link, queda logueado con cookie de sesión httpOnly ligada a un usuario real en la base de datos.

**Fase 6 — Prueba de venta end-to-end**
Con credenciales de prueba + usuario comprador de prueba: agregar al carrito → pagar con tarjeta de prueba → confirmar que llega el webhook → verificar en "Mi biblioteca" que el botón de descarga solo funciona para ese comprador → confirmar que un usuario sin compra recibe 403 al pegar la URL de descarga directamente.

## Pendientes antes de empezar a programar

Credenciales que debe aportar el usuario (no se pueden generar automáticamente):

1. **Mercado Pago (prueba)**: `Access Token` y `Public Key` de prueba (Tus integraciones → Datos de integración → Pruebas).
2. **Railway**: agregar el plugin de **PostgreSQL** al proyecto (genera `DATABASE_URL` automáticamente).
3. **Resend** (u otro proveedor de correo): API key para mandar los magic links.
4. **Dos usuarios de prueba de Mercado Pago** (comprador y vendedor) creados desde el panel.

## Siguiente paso propuesto

Preparar `.env.example` con los nombres exactos de variables y el esquema de Prisma (`users`, `orders`, `entitlements`) mientras se consiguen las credenciales.
