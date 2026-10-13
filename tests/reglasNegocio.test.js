import { test, before, beforeEach, after } from "node:test";
import assert from "node:assert/strict";

import mongoose from "mongoose";

import { validateCampaign } from "../middlewares/validateBody.js";
import Campaign from "../models/Campaign.js";
import Organization from "../models/Organization.js";
import User from "../models/User.js";

/**
 * TESTS DE INTEGRACIÓN: reglas de negocio contra MongoDB real.
 *
 * Usan una base SEPARADA (sumarimpacto_test) del mismo servidor local, nunca la
 * de desarrollo (sumarimpacto): antes de cada test se vacían sus colecciones.
 * La URI se puede cambiar con la variable de entorno MONGO_URI_TEST.
 *
 * Protección: se verifica el nombre de la base EFECTIVA de la conexión (no sólo
 * el texto de la URI) y, si no termina en "_test", no se borra nada y los tests
 * fallan. Si el servicio de MongoDB no está en ejecución, también fallan con un
 * mensaje claro: no se omiten.
 */

const URI_TEST = process.env.MONGO_URI_TEST ?? "mongodb://127.0.0.1:27017/sumarimpacto_test";

function comprobarBaseDeTest() {
  const base = mongoose.connection.name;
  if (!base || !base.endsWith("_test")) {
    throw new Error(
      `Los tests de integración sólo pueden usar una base terminada en "_test" (base conectada: "${base}"). No se borró nada.`
    );
  }
}

before(async () => {
  try {
    // autoCreate/autoIndex en false: al conectar, Mongoose no crea colecciones ni
    // índices. Así, si la URI apunta a otra base, no queda nada creado en ella
    // antes de que comprobarBaseDeTest() lo detecte.
    await mongoose.connect(URI_TEST, { serverSelectionTimeoutMS: 5000, autoCreate: false, autoIndex: false });
  } catch (err) {
    throw new Error(
      `No se pudo conectar a MongoDB para los tests de integración: ${err.message}. ` +
        "¿Está instalado MongoDB y el servicio en ejecución?"
    );
  }
  comprobarBaseDeTest();
});

beforeEach(async () => {
  // Se vuelve a comprobar justo antes de borrar.
  comprobarBaseDeTest();
  await Campaign.deleteMany({});
  await Organization.deleteMany({});
  await User.deleteMany({});
});

after(async () => {
  // Sin desconectar, node --test quedaría esperando con la conexión abierta.
  await mongoose.disconnect();
});

// ---------------------------------------------------------------------------
// Ayudas
// ---------------------------------------------------------------------------

let contador = 0;

function crearOrganizacion(status) {
  contador += 1;
  return Organization.create({
    name: `Organización de prueba ${contador}`,
    type: "ONG",
    email: `org${contador}@test.org`,
    status
  });
}

function datosCampania(organizationId, extra = {}) {
  return {
    title: "Campaña de alimentos",
    description: "Compra de alimentos para el comedor",
    targetAmount: 250000,
    organizationId,
    ...extra
  };
}

// Lo mismo que hace res.json(): pasa el documento por toJSON y JSON.stringify.
const comoRespuesta = (documento) => JSON.parse(JSON.stringify(documento));

// Un ObjectId con formato válido que no corresponde a ningún documento.
const idInexistente = () => new mongoose.Types.ObjectId().toString();

async function capturarError(promesa) {
  try {
    await promesa;
  } catch (err) {
    return err;
  }
  assert.fail("Se esperaba un error y la operación terminó bien");
}

// ---------------------------------------------------------------------------
// validateBody: sólo el formato (sin base de datos)
// ---------------------------------------------------------------------------

// validateBody sólo controla el formato de organizationId (un ObjectId en texto):
// que la organización exista y esté aprobada lo decide el modelo.
test("validateCampaign acepta un organizationId con formato válido", () => {
  const req = { body: datosCampania("64b7f0c2a1b2c3d4e5f60718", { title: " Campaña de alimentos " }) };
  let siguienteLlamado = false;
  validateCampaign("create")(req, {}, () => {
    siguienteLlamado = true;
  });

  assert.equal(siguienteLlamado, true);
  assert.equal(req.body.organizationId, "64b7f0c2a1b2c3d4e5f60718");
  assert.equal(req.body.title, "Campaña de alimentos");
});

// ---------------------------------------------------------------------------
// Campaign.crear
// ---------------------------------------------------------------------------

test("Campaign.crear rechaza una organización inexistente (404)", async () => {
  const err = await capturarError(Campaign.crear(datosCampania(idInexistente())));

  assert.equal(err.statusCode, 404);
  assert.equal(err.message, "La organización indicada no existe");
  assert.equal(await Campaign.countDocuments(), 0);
});

test("Campaign.crear rechaza una organización no aprobada (409)", async () => {
  const pendiente = await crearOrganizacion("pendiente");

  const err = await capturarError(Campaign.crear(datosCampania(pendiente.id)));

  assert.equal(err.statusCode, 409);
  assert.equal(err.message, `La organización ${pendiente.id} está en estado pendiente y no puede recibir campañas`);
  assert.equal(await Campaign.countDocuments(), 0);
});

test("Campaign.crear crea una campaña para una organización aprobada", async () => {
  const aprobada = await crearOrganizacion("aprobada");

  const campania = comoRespuesta(await Campaign.crear(datosCampania(aprobada.id)));

  // La API devuelve id y organizationId como texto, sin _id ni __v.
  assert.match(campania.id, /^[0-9a-f]{24}$/);
  assert.equal(campania.organizationId, aprobada.id);
  assert.equal(campania.title, "Campaña de alimentos");
  assert.equal(campania.targetAmount, 250000);
  assert.equal(campania.status, "borrador", "sin status se aplica el valor por defecto");
  assert.equal(campania._id, undefined);
  assert.equal(campania.__v, undefined);
  assert.ok(campania.createdAt && campania.updatedAt, "timestamps: true agrega las fechas");
});

test("el schema de Campaign rechaza targetAmount 0 (segunda capa de validación)", async () => {
  const aprobada = await crearOrganizacion("aprobada");

  const err = await capturarError(Campaign.crear(datosCampania(aprobada.id, { targetAmount: 0 })));

  assert.equal(err.name, "ValidationError");
  assert.equal(err.errors.targetAmount.message, "targetAmount debe ser un número mayor a 0");
});

// ---------------------------------------------------------------------------
// Campaign.actualizar
// ---------------------------------------------------------------------------

test("Campaign.actualizar devuelve null si la campaña no existe", async () => {
  assert.equal(await Campaign.actualizar(idInexistente(), { title: "Título nuevo" }), null);
});

test("Campaign.actualizar rechaza mover la campaña a una organización no aprobada (409)", async () => {
  const aprobada = await crearOrganizacion("aprobada");
  const pendiente = await crearOrganizacion("pendiente");
  const campania = await Campaign.crear(datosCampania(aprobada.id));

  const err = await capturarError(Campaign.actualizar(campania.id, { organizationId: pendiente.id }));

  assert.equal(err.statusCode, 409);
  const guardada = await Campaign.findById(campania.id);
  assert.equal(guardada.organizationId.toString(), aprobada.id, "la campaña no se movió");
});

test("Campaign.actualizar rechaza mover la campaña a una organización inexistente (404)", async () => {
  const aprobada = await crearOrganizacion("aprobada");
  const campania = await Campaign.crear(datosCampania(aprobada.id));

  const err = await capturarError(Campaign.actualizar(campania.id, { organizationId: idInexistente() }));

  assert.equal(err.statusCode, 404);
});

test("Campaign.actualizar cambia sólo los campos enviados", async () => {
  const aprobada = await crearOrganizacion("aprobada");
  const otra = await crearOrganizacion("aprobada");
  const campania = await Campaign.crear(datosCampania(aprobada.id, { status: "activa" }));

  // Así llegan desde el controller: los campos no enviados vienen como undefined.
  const actualizada = comoRespuesta(
    await Campaign.actualizar(campania.id, {
      title: "Título actualizado",
      description: undefined,
      targetAmount: undefined,
      status: undefined,
      organizationId: otra.id
    })
  );

  assert.equal(actualizada.title, "Título actualizado");
  assert.equal(actualizada.organizationId, otra.id);
  assert.equal(actualizada.description, "Compra de alimentos para el comedor");
  assert.equal(actualizada.targetAmount, 250000);
  assert.equal(actualizada.status, "activa");
});

// ---------------------------------------------------------------------------
// Organization
// ---------------------------------------------------------------------------

test("Organization.create aplica el estado por defecto y el schema valida type", async () => {
  const org = await Organization.create({ name: "Fundación Verde", type: "fundación", email: "a@b.org", status: undefined });
  assert.equal(org.status, "pendiente");

  const err = await capturarError(Organization.create({ name: "Empresa SA", type: "empresa", email: "e@b.org" }));
  assert.equal(err.name, "ValidationError");
});

test("Organization.eliminar rechaza una organización con campañas (409)", async () => {
  const aprobada = await crearOrganizacion("aprobada");
  await Campaign.crear(datosCampania(aprobada.id));

  const err = await capturarError(Organization.eliminar(aprobada.id));

  assert.equal(err.statusCode, 409);
  assert.equal(err.message, `La organización ${aprobada.id} tiene 1 campaña(s) y no puede eliminarse`);
  assert.ok(await Organization.findById(aprobada.id), "la organización sigue existiendo");
});

test("Organization.eliminar elimina una organización sin campañas", async () => {
  const org = await crearOrganizacion("pendiente");

  const eliminada = await Organization.eliminar(org.id);

  assert.equal(eliminada.id, org.id);
  assert.equal(await Organization.findById(org.id), null);
});

test("Organization.eliminar devuelve null si la organización no existe", async () => {
  assert.equal(await Organization.eliminar(idInexistente()), null);
});

test("Organization.actualizar cambia sólo los campos enviados y valida el schema", async () => {
  const org = await crearOrganizacion("pendiente");

  const actualizada = await Organization.actualizar(org.id, { status: "aprobada", name: undefined });
  assert.equal(actualizada.status, "aprobada");
  assert.equal(actualizada.name, org.name);

  const err = await capturarError(Organization.actualizar(org.id, { status: "inexistente" }));
  assert.equal(err.name, "ValidationError");
  assert.equal(await Organization.actualizar(idInexistente(), { status: "aprobada" }), null);
});

// ---------------------------------------------------------------------------
// Filtros (buscarTodas)
// ---------------------------------------------------------------------------

test("buscarTodas filtra organizaciones y campañas", async () => {
  const aprobada = await crearOrganizacion("aprobada");
  const otraAprobada = await crearOrganizacion("aprobada");
  await crearOrganizacion("pendiente");
  await Campaign.crear(datosCampania(aprobada.id, { status: "activa" }));
  await Campaign.crear(datosCampania(aprobada.id, { title: "Otra campaña", status: "cerrada" }));
  await Campaign.crear(datosCampania(otraAprobada.id, { status: "activa" }));

  assert.equal((await Organization.buscarTodas()).length, 3);
  assert.equal((await Organization.buscarTodas({ status: "aprobada" })).length, 2);
  assert.equal((await Organization.buscarTodas({ type: "comedor" })).length, 0);

  assert.equal((await Campaign.buscarTodas()).length, 3);
  assert.equal((await Campaign.buscarTodas({ organizationId: aprobada.id })).length, 2);
  assert.equal((await Campaign.buscarTodas({ organizationId: aprobada.id, status: "activa" })).length, 1);
});

// ---------------------------------------------------------------------------
// Borrado lógico (utils/softDelete.js)
// ---------------------------------------------------------------------------

// Lee la colección con el driver de MongoDB, sin pasar por Mongoose: así se ve
// el documento aunque esté eliminado, porque el filtro del plugin no se aplica.
const leerSinFiltro = (Modelo, id) => Modelo.collection.findOne({ _id: new mongoose.Types.ObjectId(id) });

test("Organization.eliminar es lógico: deja de existir para la aplicación pero sigue en la base", async () => {
  const org = await crearOrganizacion("aprobada");

  await Organization.eliminar(org.id);

  assert.equal(await Organization.findById(org.id), null);
  assert.equal((await Organization.buscarTodas()).length, 0);

  const guardada = await leerSinFiltro(Organization, org.id);
  assert.ok(guardada.deletedAt instanceof Date);
  assert.equal(guardada.status, "aprobada", "el estado de negocio no se toca al eliminar");
});

test("eliminar dos veces: la segunda devuelve null (404)", async () => {
  const org = await crearOrganizacion("pendiente");

  assert.notEqual(await Organization.eliminar(org.id), null);
  assert.equal(await Organization.eliminar(org.id), null);
});

test("Campaign.eliminar es lógico y una campaña eliminada no bloquea eliminar su organización", async () => {
  const org = await crearOrganizacion("aprobada");
  const campania = await Campaign.crear(datosCampania(org.id));

  await Campaign.eliminar(campania.id);

  assert.equal(await Campaign.findById(campania.id), null);
  assert.ok((await leerSinFiltro(Campaign, campania.id)).deletedAt instanceof Date);

  const eliminada = await Organization.eliminar(org.id);
  assert.equal(eliminada.id, org.id);
});

test("Campaign.crear rechaza una organización eliminada (404)", async () => {
  const org = await crearOrganizacion("aprobada");
  await Organization.eliminar(org.id);

  const err = await capturarError(Campaign.crear(datosCampania(org.id)));

  assert.equal(err.statusCode, 404);
});

test("Campaign.actualizar devuelve null si la campaña está eliminada (404)", async () => {
  const org = await crearOrganizacion("aprobada");
  const campania = await Campaign.crear(datosCampania(org.id));
  await Campaign.eliminar(campania.id);

  assert.equal(await Campaign.actualizar(campania.id, { title: "Título nuevo" }), null);
});

test("countDocuments, exists, distinct y aggregate no ven lo eliminado", async () => {
  const vigente = await crearOrganizacion("aprobada");
  const eliminada = await crearOrganizacion("pendiente");
  await Organization.eliminar(eliminada.id);

  assert.equal(await Organization.countDocuments(), 1);
  assert.equal(await Organization.exists({ _id: eliminada.id }), null);
  assert.deepEqual(await Organization.distinct("status"), ["aprobada"]);

  const agregado = await Organization.aggregate([{ $group: { _id: null, total: { $sum: 1 } } }]);
  assert.equal(agregado[0].total, 1);
  assert.notEqual(await Organization.exists({ _id: vigente.id }), null);
});

// ---------------------------------------------------------------------------
// Usuarios: alta con hash y login
// ---------------------------------------------------------------------------

function datosUsuario(extra = {}) {
  return {
    username: "mgarcia",
    name: "María García",
    email: "maria@sumarimpacto.org",
    password: "clave-segura",
    ...extra
  };
}

test("User.crear guarda el hash, nunca la contraseña, y la respuesta no lo incluye", async () => {
  const user = await User.crear(datosUsuario());

  assert.notEqual(user.passwordHash, "clave-segura");
  assert.match(user.passwordHash, /^\$2[aby]\$10\$/);
  assert.equal(user.role, "organizacion", "sin rol, el de menos permisos");

  const respuesta = comoRespuesta(user);
  assert.equal(respuesta.passwordHash, undefined);
  assert.equal(respuesta.password, undefined);
});

test("User.crear rechaza username o email repetidos (409), sin distinguir mayúsculas", async () => {
  await User.crear(datosUsuario());

  const porUsername = await capturarError(User.crear(datosUsuario({ username: "MGarcia", email: "otra@x.org" })));
  assert.equal(porUsername.statusCode, 409);

  const porEmail = await capturarError(User.crear(datosUsuario({ username: "otra", email: "MARIA@sumarimpacto.org" })));
  assert.equal(porEmail.statusCode, 409);

  assert.equal(await User.countDocuments(), 1);
});

test("User.verificarCredenciales entra con username o con email", async () => {
  await User.crear(datosUsuario());

  assert.equal((await User.verificarCredenciales("MGarcia", "clave-segura")).username, "mgarcia");
  assert.equal((await User.verificarCredenciales("Maria@SumarImpacto.org", "clave-segura")).username, "mgarcia");
});

test("User.verificarCredenciales devuelve null con contraseña incorrecta, usuario inexistente o eliminado", async () => {
  const user = await User.crear(datosUsuario());

  assert.equal(await User.verificarCredenciales("mgarcia", "otra-clave"), null);
  assert.equal(await User.verificarCredenciales("nadie", "clave-segura"), null);

  user.deletedAt = new Date();
  await user.save();
  assert.equal(await User.verificarCredenciales("mgarcia", "clave-segura"), null);
});

test("User.crear rechaza (409) el username o email de un usuario eliminado: siguen reservados", async () => {
  // La conexión de los tests usa autoIndex: false, así que el índice único no se
  // crea solo: se crea acá para probar la regla como en la aplicación real.
  await User.createIndexes();
  const user = await User.crear(datosUsuario());
  user.deletedAt = new Date();
  await user.save();

  const err = await capturarError(User.crear(datosUsuario()));
  assert.equal(err.statusCode, 409);
});
