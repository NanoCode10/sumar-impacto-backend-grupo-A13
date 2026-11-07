# SumarImpacto Backend - Grupo A13

Proyecto académico de la materia **Desarrollo de Sistemas Web Back End** del
**IFTS N° 29 - 2do Cuatrimestre 2026**. Entrega final (3° parcial).

## Sobre el proyecto

**SumarImpacto** es una asociación civil que vincula organizaciones sociales (ONG, fundaciones y
comedores) con donantes que financian sus campañas. El sistema gestiona organizaciones, campañas,
donantes y donaciones con énfasis en la **trazabilidad y la transparencia** de los fondos, con
usuarios, roles y un chat interno con un asistente de IA.

## Contenido

- [Probarlo en línea](#probarlo-en-línea)
- [Probarlo en local](#probarlo-en-local)
- [Variables de entorno](#variables-de-entorno)
- [Cómo funciona](#cómo-funciona): arquitectura, roles y permisos, reglas de negocio, chat
- [API REST](#api-rest-json)
- [Seguridad](#seguridad)
- [Pruebas](#pruebas)
- [Despliegue](#despliegue)
- [Equipo](#equipo)

## Probarlo en línea

**https://sumarimpacto-staging.onrender.com**

Entorno de prueba (rama `juanMa`). El de producción se publica desde `main`; el link definitivo
está en la documentación de la entrega.

- La base de datos es **MongoDB Atlas**.
- El plan gratuito de Render **se duerme tras 15 minutos sin uso**: el primer pedido puede tardar
  cerca de un minuto en responder.
- Sin iniciar sesión se ven las organizaciones y las campañas. Para el resto hay que **Ingresar**.

**Usuarios de prueba** (los mismos en línea y en local, cargados con el seed):

| Usuario | Contraseña | Rol |
|---|---|---|
| `superadmin` | `superadmin` | superadmin |
| `administrador` | `administrador` | administrador |
| `auditoria` | `auditoria` | auditoria |
| `organizacion` | `organizacion` | organizacion (referente de «Comedor Esperanza») |

Son **credenciales ficticias de un proyecto académico**. En un despliegue real se cambiarían por
contraseñas fuertes antes de publicar el sitio.

## Probarlo en local

### Requisitos

- **Node.js 24** (el que declara `package.json`; Mongoose 9 exige 20.19 o más).
- **MongoDB Community Server** instalado y en ejecución, escuchando en `127.0.0.1:27017`.

  En Windows, con el instalador `.msi` de <https://www.mongodb.com/try/download/community>
  (opción **Complete** e **Install MongoD as a Service**) o con
  `winget install -e --id MongoDB.Server`. Para comprobarlo: `Get-Service MongoDB` tiene que decir
  `Running`; si está detenido, `Start-Service MongoDB` en una terminal de administrador.

### Pasos

```bash
npm install                                  # dependencias
npm run setup                                # crea .env (MongoDB local) con un SESSION_SECRET al azar
npm run seed -- --confirm-db=sumarimpacto    # datos de ejemplo
npm test                                     # 147 pruebas
npm run dev                                  # servidor en http://localhost:3000
```

`npm run setup` copia `.env.example` como `.env` y genera la clave de sesión; si el `.env` ya
existe, no lo pisa. En PowerShell, si la política bloquea `npm`, usar `npm.cmd`.

### Datos de ejemplo (seed)

`scripts/seed.js` carga **3 organizaciones, 1 campaña y 4 usuarios** (uno por rol; el referente
queda vinculado a «Comedor Esperanza»). Lee `data/*.json`, que no modifica, y:

- **exige confirmar la base destino** con `--confirm-db=<nombre>` y compara ese nombre con el de la
  base **realmente conectada**; si no coincide, termina sin escribir nada;
- **no borra ni duplica**: omite la organización con el mismo email, la campaña con el mismo título
  en su organización y el usuario con el mismo username o email;
- conserva la relación organización → campaña aunque en los JSON los ids sean números.

**Usuarios de prueba:** los de la [tabla de arriba](#probarlo-en-línea). Sus contraseñas están en
`data/users.json`, en texto porque son ficticias; el seed las guarda hasheadas. Se puede entrar con
el usuario o con el email.

### El asistente del chat es opcional

El chat funciona sin clave de Gemini: el asistente aparece como «no configurado». Para probarlo,
ver [Variables de entorno](#variables-de-entorno).

## Variables de entorno

Se definen en `.env` (local) o en el panel del servicio (Render). El `.env` nunca se sube a Git; la
plantilla es `.env.example`.

| Variable | Obligatoria | Qué es |
|---|---|---|
| `MONGO_URI` | Sí | Cadena de conexión. Por defecto MongoDB local (`mongodb://127.0.0.1:27017/sumarimpacto`); el equipo usa Atlas |
| `SESSION_SECRET` | Sí | Firma la cookie de sesión. Sin ella **la app no arranca**, a propósito. `npm run setup` la genera; a mano: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `PORT` | No | Puerto (3000 por defecto; Render pone el suyo) |
| `MONGO_URI_TEST` | No | Base de los tests (`sumarimpacto_test` local por defecto). Nunca la de Atlas |
| `NODE_ENV` | En producción | `production` activa la cookie sólo por HTTPS y la confianza en el proxy de Render |
| `GEMINI_API_KEY` | No | Clave del asistente del chat. **Cada integrante genera la suya** en <https://aistudio.google.com/api-keys> (plan gratuito) y no la comparte |
| `GEMINI_MODEL` | No | Modelo de Gemini (`gemini-3.5-flash-lite`). Google retira modelos: la lista vigente está en <https://aistudio.google.com/docs/models> |

**MongoDB Atlas (equipo):** pedir acceso al proyecto `SumarImpacto-A13`, crear un usuario de base
propio con permiso `readWrite` sobre `sumarimpacto`, autorizar la IP y poner su cadena en
`MONGO_URI`. No correr el seed ni los tests contra Atlas.

## Cómo funciona

### Arquitectura (MVC)

```text
Navegador ──fetch──▶ /api ─▶ control de sesión ─▶ Router ─▶ middlewares (rol, propiedad, validación)
                                                              │
                                                              ▼
                                                         Controller ─▶ Model (Mongoose) ─▶ MongoDB
Navegador ──────────▶ /     ─▶ Router de vistas ─▶ Controller ─▶ vista Pug (HTML)
Navegador ─Socket.IO▶ chat  ─▶ misma sesión ─▶ sockets/chat.js ─▶ services/asistente.js ─▶ Gemini
```

| Carpeta | Qué hay |
|---|---|
| `index.js` | Arranque: sesión, rutas, servidor HTTP compartido por Express y Socket.IO |
| `config/` | Conexión a MongoDB, sesión (`session.js`), parámetros de comisiones, instrucción del asistente |
| `routes/` | `apiRoutes.js` (entrada única de la API) y las rutas de cada recurso y de las vistas |
| `middlewares/` | Sesión y roles (`auth.js`), propiedad (`propiedad.js`), validaciones, errores |
| `controllers/` | Traducen entre HTTP y el Model; `async`, delegan errores con `next(err)` |
| `models/` | Schemas de Mongoose y **reglas de negocio**; la única capa que toca la base |
| `services/` | El asistente de IA (Gemini) |
| `sockets/` | El chat en tiempo real |
| `views/` y `public/js/` | Páginas Pug y el JavaScript del navegador (`fetch`, Socket.IO) |
| `scripts/` | `setup.js` (crea el `.env`) y `seed.js` (datos de ejemplo) |
| `tests/` | Pruebas automáticas |

La **API** (`/api/...`) responde siempre JSON; las **vistas** responden HTML. Las reglas están en el
servidor: el JavaScript del navegador sólo muestra datos y manda pedidos.

### Roles y permisos

| Rol | Organizaciones | Campañas | Donantes y donaciones | Usuarios |
|---|---|---|---|---|
| Sin sesión | consulta | consulta | — | — |
| `superadmin` | gestiona | gestiona | gestiona | gestiona |
| `administrador` | gestiona | gestiona | gestiona | — |
| `auditoria` | consulta | consulta | consulta | — |
| `organizacion` (referente) | consulta | crea y edita **sólo las de su organización** | consulta | — |

- **Denegar por defecto:** toda la API exige sesión salvo lo declarado público (consultas de
  organizaciones y campañas, y el login). Un recurso nuevo nace protegido.
- **Control por propiedad:** el rol dice qué se puede hacer; la propiedad, sobre qué datos. El
  referente queda vinculado a una organización y la API rechaza (403) sus cambios sobre campañas
  ajenas.
- El **rol es obligatorio** al crear un usuario: los da de alta un superadmin y nadie recibe permisos
  por omisión. No se puede eliminar ni degradar al último superadmin.

### Sesión

Se usan **sesiones** (`express-session`) guardadas en MongoDB (`connect-mongo`), no JWT: la app es
una web servida por el mismo servidor, la cookie es HttpOnly (el JavaScript de la página no la lee)
y la sesión se puede revocar al instante. En cada pedido se relee el usuario: **una baja o un cambio
de rol rigen en el próximo pedido**. La sesión dura 8 horas y se regenera al iniciarla.

### Reglas de negocio

- Sólo una organización **aprobada** tiene campañas, y sólo una campaña **activa** recibe donaciones.
- **Donaciones con criterio contable:** el servidor calcula la comisión (3,5 %), los gastos del
  medio de pago (1,218 % transferencia y débito, 2,428 % crédito) y el neto; asigna un **certificado
  correlativo y único** (`CERT-000001`); una donación **no se modifica**: se anula (queda registrada
  como anulada, con fecha) y se registra otra.
- **Integridad:** no se elimina una organización con campañas, ni una campaña o un donante con
  donaciones (se cierran o se inactivan). El documento del donante es único, aunque se escriba con
  puntos o guiones.
- **Borrado lógico:** el `DELETE` marca la fecha en `deletedAt`; lo eliminado deja de aparecer y da
  404, pero se conserva la historia. El filtro está en un solo lugar, `utils/softDelete.js`.

### Chat con asistente de IA

Página **Chat** (con sesión): mensajes en tiempo real con **Socket.IO** sobre el mismo servidor y
la misma sesión. El nombre de quien escribe lo pone el servidor. Los mensajes que empiezan con
**`@gemini`** se consultan a Gemini (`@google/genai`), que responde con la guía del sistema de
`config/asistente.txt` y sólo sobre SumarImpacto. Límites: una consulta cada 15 s por usuario, 10
por usuario y 50 en total por día, respuestas cortas y 20 s de espera máxima. Las consultas se
envían a Google: no hay que escribir datos personales.

## API REST (JSON)

Todas las rutas están bajo `/api`. Sin sesión, sólo lo marcado como público.

| Método | Ruta | Descripción | Quién |
|---|---|---|---|
| GET | `/api/organizations` | Lista (filtros `type`, `status`) | público |
| GET | `/api/organizations/:id` | Obtiene una | público |
| GET | `/api/organizations/:id/campaigns` | Campañas de una organización | público |
| POST · PUT · DELETE | `/api/organizations[/:id]` | Crea, actualiza, elimina | superadmin, administrador |
| GET | `/api/campaigns` | Lista (filtros `organizationId`, `status`) | público |
| GET | `/api/campaigns/:id` | Obtiene una | público |
| POST · PUT | `/api/campaigns[/:id]` | Crea, actualiza | superadmin, administrador, referente (sólo las suyas) |
| DELETE | `/api/campaigns/:id` | Elimina | superadmin, administrador |
| GET | `/api/donors[/:id]` | Lista u obtiene | con sesión |
| POST · PUT · DELETE | `/api/donors[/:id]` | Crea, actualiza, elimina | superadmin, administrador |
| GET | `/api/donations[/:id]` | Lista (filtros `donorId`, `campaignId`, `paymentMethod`, `status`) u obtiene | con sesión |
| POST | `/api/donations` | Registra y calcula importes | superadmin, administrador |
| PUT | `/api/donations/:id` | **405**: una donación no se modifica | — |
| DELETE | `/api/donations/:id` | Anula | superadmin, administrador |
| GET · POST · PUT · DELETE | `/api/users[/:id]` | Gestión de usuarios | superadmin |
| POST | `/api/auth/login` | Inicia sesión (`{ "usuario", "password" }`, usuario o email) | público |
| POST | `/api/auth/logout` | Cierra la sesión | público |
| GET | `/api/auth/me` | Usuario de la sesión actual | público |

### Valores permitidos

- **Organización** `type`: `ONG`, `fundación`, `comedor` · `status`: `pendiente`, `aprobada`, `suspendida`, `desvinculada`
- **Campaña** `status`: `borrador`, `activa`, `suspendida`, `cerrada`
- **Donante** `type`: `individual`, `corporativo` · `status`: `activo`, `inactivo`
- **Donación** `paymentMethod`: `transferencia`, `debito`, `credito` · `status`: `acreditada`, `anulada`
- **Usuario** `role`: `superadmin`, `administrador`, `auditoria`, `organizacion` (obligatorio; el referente exige `organizationId`)

Los filtros y valores se comparan sin distinguir tildes ni mayúsculas (`?type=fundacion` encuentra
`fundación`). Los ids son ObjectId de MongoDB; la API los devuelve en el campo `id`.

### Validaciones y errores

Dos capas: **middlewares** (`validateId`, `validateBody`, `validateQuery`) antes del controller, y
los **schemas de Mongoose**. `middlewares/errors.js` centraliza las respuestas: JSON en la API y la
página `error.pug` en las vistas; un error inesperado responde 500 sin detalles internos.

| Código | Cuándo |
|---|---|
| `400` | Id, body o filtro inválidos; JSON mal formado; monto con más de dos decimales |
| `401` | Sin sesión, o usuario y contraseña que no coinciden |
| `403` | El rol no alcanza, o el referente opera sobre una campaña ajena |
| `404` | La ruta o el recurso no existen |
| `405` | Editar una donación |
| `409` | Reglas de negocio: organización no aprobada, campaña no activa, eliminar con dependencias, documento o certificado repetidos, donación ya anulada, último superadmin |
| `500` | Error inesperado |

## Seguridad

- **Contraseñas:** hash PBKDF2 con sal propia (módulo `crypto`, como el ejemplo de la cátedra),
  comparación con `timingSafeEqual`; ninguna respuesta incluye el hash.
- **Sesión:** cookie `sumarimpacto.sid` HttpOnly, SameSite=Lax y Secure en producción; secreto
  obligatorio; sesión regenerada al iniciarla (fijación de sesión); usuario revalidado en cada pedido.
- **Acceso:** denegar por defecto, roles y control por propiedad, siempre en el servidor.
- **XSS:** todo lo que escribe un usuario, o responde Gemini, se muestra como texto, nunca como HTML.
- **Secretos:** en variables de entorno; un usuario de base por persona y otro para la app, con el
  mínimo permiso.
- **Inyección NoSQL:** los filtros pasan por lista blanca y los valores se validan por tipo.

## Pruebas

```bash
npm test     # node --test: 147 pruebas
```

Con `node:test` y `node:assert/strict`, sin dependencias externas. Los tests de reglas de negocio usan
una base local **separada** (`sumarimpacto_test`) y verifican que el nombre termine en `_test` antes
de limpiarla. Necesitan el servicio de MongoDB en ejecución.

| Archivo | Tests | Qué prueba |
|---|---|---|
| `apiPermisos.test.js` | 3 | Denegar por defecto: recorre todas las rutas de la API y exige 401 sin sesión |
| `auth.test.js` | 4 | Middlewares de sesión y rol |
| `revalidarSesion.test.js` | 4 | Baja y cambio de rol rigen al instante |
| `login.test.js` | 2 | Regeneración de la sesión al iniciarla |
| `propiedad.test.js` | 7 | El referente gestiona sólo las campañas de su organización |
| `chat.test.js` | 8 | Validación de mensajes, `@gemini`, cupo diario, presencia y tiempo máximo |
| `reglasNegocio.test.js` | 46 | Reglas 404/409, borrado lógico, usuarios, donantes y donaciones contra MongoDB |
| `validateId.test.js` | 10 | Ids ObjectId |
| `validateOrganization.test.js` | 17 | Organizaciones |
| `validateCampaigns.test.js` | 26 | Campañas |
| `validateDonorsDonations.test.js` | 5 | Donantes, donaciones y filtros |
| `validateUser.test.js` | 15 | Usuarios y login |

## Despliegue

En **Render** (proceso permanente: lo necesitan la sesión y el chat con WebSocket; Vercel no los
admite) con **MongoDB Atlas**.

- **Build:** `npm ci` · **Start:** `npm start` · **Health check:** `/` · Node 24.
- **Variables:** `NODE_ENV=production`, `MONGO_URI` (usuario de base exclusivo de la app),
  `SESSION_SECRET` (generado por Render), `GEMINI_API_KEY` y `GEMINI_MODEL`.
- **Atlas:** acceso de red abierto (`0.0.0.0/0`) porque Render gratuito no tiene IP fija; la
  protección queda en el usuario de base, con permiso sólo sobre `sumarimpacto`.

## Equipo

Grupo A13. El detalle de las tareas de cada integrante está en la documentación de la entrega.

| Integrante (GitHub) | Aportes principales |
|---|---|
| Mariano (NanoCode10) | Base MVC, ES Modules, MongoDB y Mongoose, seed, pantallas con `fetch`, tests, Atlas |
| Daniela (dani_) | CRUD y vistas de la primera entrega; sesión y control de acceso por roles |
| Fernando (fer) | Pruebas unitarias de la primera entrega; donantes y donaciones |
| Emilse (Emi1000se) | Actualización de versiones (Express 5, Pug, Nodemon) |
| Juan Manuel (JuanMA) | Integración, validaciones y reglas de negocio; usuarios y hash; seguridad de la sesión, permisos y control por propiedad; donaciones con criterio contable; chat con IA; despliegue |
