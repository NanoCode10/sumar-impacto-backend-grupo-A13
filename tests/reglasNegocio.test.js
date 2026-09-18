const { test } = require("node:test");
const assert = require("node:assert/strict");

const fs = require("node:fs");
const path = require("node:path");

const { validateCampaign } = require("../middlewares/validateBody");
const Campaign = require("../models/Campaign");
const Organization = require("../models/Organization");

const campaignsPath = path.join(__dirname, "..", "data", "campaigns.json");

function ejecutarValidador(body, mode = "create") {
  const req = { body };
  let respuesta;
  let siguienteLlamado = false;

  const res = {
    status(codigo) {
      respuesta = { codigo };
      return this;
    },
    json(data) {
      respuesta.body = data;
      return this;
    }
  };

  const next = () => {
    siguienteLlamado = true;
  };

  validateCampaign(mode)(req, res, next);

  return { req, respuesta, siguienteLlamado };
}

function mostrarResultado(nombre, entrada, resultado) {
  console.log(`\n${nombre}`);
  console.log("Body ingresado:", JSON.stringify(entrada));
  console.log("Status retornado:", resultado.respuesta?.codigo ?? "sin respuesta");
  console.log("JSON retornado:", JSON.stringify(resultado.respuesta?.body ?? null));
  console.log("Body luego de validar:", JSON.stringify(resultado.req.body));
  console.log("¿Se llamó a next()?:", resultado.siguienteLlamado);
}

function cuerpoValido() {
  return {
    title: "Campaña de alimentos",
    description: "Compra de alimentos para el comedor",
    targetAmount: 250000,
    organizationId: 1,
    status: "activa"
  };
}

function probarError(nombre, entrada) {
  const resultado = ejecutarValidador(entrada);
  mostrarResultado(nombre, entrada, resultado);

  assert.equal(resultado.siguienteLlamado, false);
  assert.equal(resultado.respuesta.codigo, 400);
  return resultado;
}

// validateBody sólo controla el formato (number entero positivo): que la
// organización exista y esté aprobada lo decide el modelo, no el middleware.
test("validateCampaign acepta un organizationId con formato válido", () => {
  const entrada = {
    title: " Campaña de alimentos ",
    description: " Compra de alimentos para el comedor ",
    targetAmount: 250000,
    organizationId: 4,
    status: "ACTIVA"
  };
  const resultado = ejecutarValidador(entrada);
  mostrarResultado("Campaña válida", entrada, resultado);

  assert.equal(resultado.siguienteLlamado, true);
  assert.equal(resultado.respuesta, undefined);
  assert.equal(resultado.req.body.title, "Campaña de alimentos");
  assert.equal(resultado.req.body.description, "Compra de alimentos para el comedor");
  assert.equal(resultado.req.body.targetAmount, 250000);
  assert.equal(resultado.req.body.organizationId, 4);
  assert.equal(resultado.req.body.status, "activa");
});





//Caso de prueba adicional para verificar que se rechaza crear una campaña para una organización con estado pendiente en el módulo campaings
test("Campaign.create rechaza una organización no aprobada (id 4)", () => {
  const entrada = {
    title: "Campaña de alimentos",
    description: "Compra de alimentos para el comedor",
    targetAmount: 250000,
    organizationId: 4,
    status: "activa"
  };

  // En data/organizations.json no hay organizaciones pendientes: se reemplaza
  // temporalmente Organization.findById (Campaign.create la consulta vía require
  // diferido, que devuelve esta misma clase) y se restaura siempre en el finally.
  const findByIdOriginal = Organization.findById;
  Organization.findById = (id) =>
    id === 4 ? new Organization(4, "Organización pendiente", "ONG", "pendiente@test.org", "pendiente") : null;

  let errorCapturado;
  try {
    assert.throws(
      () => Campaign.create(entrada),
      (error) => {
        errorCapturado = error;
        return error.statusCode === 409;
      }
    );
  } finally {
    Organization.findById = findByIdOriginal;
  }

  console.log("\nCampaign.create - organización no aprobada");
  console.log("Body ingresado:", JSON.stringify(entrada));
  console.log("Status del error:", errorCapturado.statusCode);
  console.log("Mensaje retornado:", errorCapturado.message);

  assert.equal(errorCapturado.statusCode, 409);
  assert.equal(
    errorCapturado.message,
    "La organización 4 está en estado pendiente y no puede recibir campañas"
  );
});

//Caso de prueba adicional para verificar que se rechaza una organización inexistente al crear una campaña en el módulo campaings
//los casos positivos ya están cubiertos en los tests de validateCampaigns.test.js y validateOrganization.test.js

test("Campaign.create rechaza una organización inexistente (id 999)", () => {
  const entrada = {
    title: "Campaña de alimentos",
    description: "Compra de alimentos para el comedor",
    targetAmount: 250000,
    organizationId: 999,
    status: "activa"
  };

  let errorCapturado;
  assert.throws(
    () => Campaign.create(entrada),
    (error) => {
      errorCapturado = error;
      return error.statusCode === 404;
    }
  );

  console.log("\nCampaign.create - organización inexistente");
  console.log("Body ingresado:", JSON.stringify(entrada));
  console.log("Status del error:", errorCapturado.statusCode);
  console.log("Mensaje retornado:", errorCapturado.message);

  assert.equal(errorCapturado.statusCode, 404);
  assert.equal(errorCapturado.message, "La organización indicada no existe");
});

test("Campaign.create crea una campaña para una organización aprobada", () => {
  const entrada = {
    title: "Campaña de alimentos",
    description: "Compra de alimentos para el comedor",
    targetAmount: 250000,
    organizationId: 1,
    status: "activa"
  };
  let campañaCreada;
  // Campaign.create escribe en data/campaigns.json y Campaign.delete lo reescribe
  // sin el salto de línea final: se guarda el contenido exacto y se restaura en el
  // finally para no dejar cambios en el archivo.
  const contenidoOriginal = fs.readFileSync(campaignsPath);

  try {
    campañaCreada = Campaign.create(entrada);

    console.log("\nCampaign.create - organización aprobada");
    console.log("Body ingresado:", JSON.stringify(entrada));
    console.log("Campaña retornada:", JSON.stringify(campañaCreada));

    assert.equal(typeof campañaCreada.id, "number");
    assert.equal(campañaCreada.organizationId, 1);
    assert.equal(campañaCreada.title, entrada.title);
    assert.equal(campañaCreada.description, entrada.description);
    assert.equal(campañaCreada.targetAmount, 250000);
    assert.equal(campañaCreada.status, "activa");
  } finally {
    fs.writeFileSync(campaignsPath, contenidoOriginal);
  }
});
