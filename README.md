# SumarImpacto Backend - Grupo A13

Proyecto académico desarrollado para la materia **Desarrollo de Sistemas Web Back End**  
del **IFTS N° 29 - 2do Cuatrimestre 2026**.

## Sobre el proyecto

**SumarImpacto** es una asociación civil sin fines de lucro orientada a vincular
organizaciones sociales con donantes interesados en financiar proyectos de impacto social.

El sistema busca facilitar la gestión de campañas, fondos y rendiciones, haciendo
especial énfasis en la **trazabilidad y transparencia del uso de los recursos**.

## Objetivo

Desarrollar el backend del sistema mediante una **API REST**, aplicando los conceptos
trabajados durante la cursada.

Inicialmente la persistencia de datos se realizará utilizando archivos **JSON** y,
posteriormente, se incorporará **MongoDB**.

## Estado actual

Actualmente se encuentra implementada la base inicial del backend. Este es un
estado parcial correspondiente a la **Etapa 1** del proyecto y no representa la
documentación final del sistema.

Lo implementado hasta el momento incluye:

- Node.js
- Express 5
- arquitectura MVC (Router → Controller → Model → respuesta JSON o vista Pug)
- persistencia en archivos JSON (`data/organizations.json`, `data/campaigns.json`)
- Pug como motor de vistas

## API REST (JSON)

Todas las rutas de la API están bajo `/api` y responden siempre JSON.

| Método | Ruta                               | Descripción                                                     |
| ------ | ---------------------------------- | --------------------------------------------------------------- |
| GET    | `/api/organizations`               | Lista organizaciones (filtros opcionales `type` y `status`)     |
| POST   | `/api/organizations`               | Crea una organización                                           |
| GET    | `/api/organizations/:id`           | Obtiene una organización                                        |
| GET    | `/api/organizations/:id/campaigns` | Lista las campañas de una organización                          |
| PUT    | `/api/organizations/:id`           | Actualiza una organización                                      |
| DELETE | `/api/organizations/:id`           | Elimina una organización                                        |
| GET    | `/api/campaigns`                   | Lista campañas (filtros opcionales `organizationId` y `status`) |
| POST   | `/api/campaigns`                   | Crea una campaña                                                |
| GET    | `/api/campaigns/:id`               | Obtiene una campaña                                             |
| PUT    | `/api/campaigns/:id`               | Actualiza una campaña                                           |
| DELETE | `/api/campaigns/:id`               | Elimina una campaña                                             |

## Vistas HTML (Pug)

Estas rutas NO forman parte de la API: devuelven páginas HTML.

| Ruta                 | Página                                              |
| -------------------- | --------------------------------------------------- |
| `/`                  | Inicio, con el listado de organizaciones y campañas |
| `/organizations/:id` | Detalle de una organización                         |
| `/campaigns/:id`     | Detalle de una campaña                              |

## Consultas

- `GET /api/organizations?type=comedor&status=aprobada`: filtra organizaciones
  combinando dos query params. Los valores se comparan sin distinguir tildes ni
  mayúsculas (`?type=fundacion` encuentra `fundación`).
- `GET /api/campaigns?organizationId=1&status=activa`: filtra campañas por la
  organización a la que pertenecen y por su estado.
- `GET /api/organizations/1/campaigns`: recorre la relación entre recursos y
  devuelve las campañas de una organización (404 si la organización no existe).

Un valor de filtro fuera de los permitidos responde `400` indicando los valores válidos.

## Valores permitidos

Definidos en los Models (`models/Organization.js` y `models/Campaign.js`):

- **Organization `type`**: `ONG`, `fundación`, `comedor`
- **Organization `status`**: `pendiente`, `aprobada`, `suspendida`, `baja` (por defecto `pendiente`)
- **Campaign `status`**: `borrador`, `activa`, `suspendida`, `cerrada` (por defecto `borrador`)

## Validaciones y manejo de errores

Middlewares en `middlewares/`:

- `validateId.js`: el `:id` de la URL debe ser un entero positivo (si no, `400`).
- `validateBody.js`: en POST controla campos obligatorios; en POST y PUT controla
  tipos de datos reales (un número enviado como texto se rechaza) y valores
  permitidos (si no, `400`).
- `validateQuery.js`: valida los filtros de los listados (si no, `400`).
- `errors.js`: responde `404` cuando la ruta no existe y centraliza los errores.
  En la API responde JSON y en las vistas HTML; un error inesperado devuelve
  `500` con un mensaje genérico, sin exponer detalles internos.

## Reglas de negocio

- Una campaña debe referenciar una organización existente → `404` si no existe.
- Para crear una campaña, o moverla a otra organización, la organización debe
  estar `aprobada` → `409` si está en otro estado.
- Una organización con campañas asociadas no puede eliminarse → `409`.

## Evidencia de pruebas

La siguiente captura corresponde a una prueba realizada con Postman sobre
`GET /api/organizations/1`.

<p align="center">
  <img src="docs/images/postman-get-organization-1.png"
       alt="Prueba en Postman de GET /api/organizations/1"
       width="900">
</p>

<p align="center">
  <em>Prueba de GET /api/organizations/1 con Postman.</em>
</p>

Casos verificados sobre la API actual:

- GET /api/organizations/1 → 200 OK
- GET /api/organizations/999 → 404 Not Found
- GET /api/organizations/abc → 400 Bad Request
- GET /api/organizations/0 → 400 Bad Request

## Testing automatizado

El proyecto incluye pruebas automatizadas utilizando el módulo nativo de Node.js `node:test` junto con `node:assert/strict`.

No se agregaron dependencias externas para testing.

Actualmente se prueban:

- `validateId.test.js`: validación de IDs válidos e inválidos, incluyendo la delegación de errores mediante `next(err)`.
- `validateOrganization.test.js`: validaciones de organizaciones, campos obligatorios, tipos, valores permitidos y normalización.
- `validateCampaigns.test.js`: validaciones de campañas, tipos reales de datos, campos obligatorios y valores permitidos.
- `reglasNegocio.test.js`: reglas de negocio relacionadas con la creación de campañas y el estado de las organizaciones.

Para ejecutar todas las pruebas:

```bash
node --test tests/validateId.test.js tests/validateOrganization.test.js tests/validateCampaigns.test.js tests/reglasNegocio.test.js
```

Resultado actual:

```text
tests 56
pass 56
fail 0
```

Las pruebas se ejecutan de forma aislada y no dejan modificaciones permanentes en los archivos de persistencia `data/*.json`.

## Tecnologías

- JavaScript
- Node.js
- Express 5
- Pug
- JSON
- Nodemon (desarrollo)
- MongoDB _(más adelante durante la cursada)_

## Cómo ejecutar el proyecto

1. Instalar las dependencias:

```bash
npm install
```

2. Levantar el servidor en modo desarrollo:

```bash
npm run dev
```

Este comando ejecuta `nodemon index.js`, por lo que el servidor se reinicia automáticamente cuando se modifican archivos.

También puede ejecutarse sin Nodemon:

```bash
npm start
```

que ejecuta directamente:

```bash
node index.js
```

Una vez iniciado el servidor, la API puede probarse desde el navegador o Postman:

```text
http://localhost:3000/api/organizations/1
```

O desde la terminal:

```bash
curl -i http://localhost:3000/api/organizations/1
```

Las vistas HTML se abren desde el navegador en `http://localhost:3000/`.

Los comandos `npm start` y `npm run dev` están definidos en la sección `scripts` de `package.json`.

## Grupo

**Grupo A13 - Desarrollo de Sistemas Web Back End**

## Estado

🚧 Proyecto en desarrollo.
