import { test } from "node:test";
import assert from "node:assert/strict";

import { validateCampaign } from "../middlewares/validateBody.js";

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

// organizationId es un ObjectId de MongoDB escrito como texto. Para validar el
// formato no hace falta que la organización exista: eso lo decide el modelo.
const ORG_ID = "64b7f0c2a1b2c3d4e5f60718";
const MENSAJE_ORG_ID = "organizationId debe ser un ObjectId válido (24 caracteres hexadecimales)";

function cuerpoValido() {
  return {
    title: "Campaña de alimentos",
    description: "Compra de alimentos para el comedor",
    targetAmount: 250000,
    organizationId: ORG_ID,
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

// validateBody exige el tipo real del JSON: los números llegan como number y no
// se convierten desde string. Sólo se normalizan textos (trim) y el status (canónico).
test("acepta una campaña válida y normaliza textos y estado", () => {
  const entrada = {
    title: " Campaña de alimentos ",
    description: " Compra de alimentos para el comedor ",
    targetAmount: 250000,
    organizationId: ORG_ID,
    status: "ACTIVA"
  };
  const resultado = ejecutarValidador(entrada);
  mostrarResultado("Campaña válida", entrada, resultado);

  assert.equal(resultado.siguienteLlamado, true);
  assert.equal(resultado.respuesta, undefined);
  assert.equal(resultado.req.body.title, "Campaña de alimentos");
  assert.equal(resultado.req.body.description, "Compra de alimentos para el comedor");
  assert.equal(resultado.req.body.targetAmount, 250000);
  assert.equal(resultado.req.body.organizationId, ORG_ID);
  assert.equal(resultado.req.body.status, "activa");
});

test("rechaza title null", () => {
  probarError("title null", { ...cuerpoValido(), title: null });
});

test("rechaza description null", () => {
  probarError("description null", { ...cuerpoValido(), description: null });
});

test("rechaza targetAmount null", () => {
  probarError("targetAmount null", { ...cuerpoValido(), targetAmount: null });
});

test("rechaza organizationId null", () => {
  probarError("organizationId null", { ...cuerpoValido(), organizationId: null });
});

test("rechaza status null", () => {
  probarError("status null", { ...cuerpoValido(), status: null });
});

test("rechaza title de cuatro caracteres", () => {
  probarError("title con cuatro caracteres", { ...cuerpoValido(), title: "Abcd" });
});

test("rechaza title de 121 caracteres", () => {
  probarError("title demasiado largo", { ...cuerpoValido(), title: "A".repeat(121) });
});

test("rechaza description vacía", () => {
  probarError("description vacía", { ...cuerpoValido(), description: "" });
});

test("rechaza description con sólo espacios", () => {
  probarError("description con espacios", { ...cuerpoValido(), description: "   " });
});

test("rechaza targetAmount alfanumérico no convertible", () => {
  probarError("targetAmount alfanumérico", { ...cuerpoValido(), targetAmount: "abc" });
});

test("rechaza organizationId que no es un ObjectId", () => {
  const resultado = probarError("organizationId alfanumérico", { ...cuerpoValido(), organizationId: "abc" });
  assert.equal(resultado.respuesta.body.error, MENSAJE_ORG_ID);
});

test("rechaza targetAmount numérico enviado como string", () => {
  const resultado = probarError("targetAmount como string", { ...cuerpoValido(), targetAmount: "250000" });
  assert.equal(resultado.respuesta.body.error, "targetAmount debe ser un número mayor a 0");
});

// Un ObjectId llega como texto: un number (el formato de id anterior) se rechaza.
test("rechaza organizationId numérico", () => {
  const resultado = probarError("organizationId numérico", { ...cuerpoValido(), organizationId: 1 });
  assert.equal(resultado.respuesta.body.error, MENSAJE_ORG_ID);
});

test("rechaza organizationId de 23 caracteres", () => {
  probarError("organizationId de 23 caracteres", { ...cuerpoValido(), organizationId: ORG_ID.slice(1) });
});

test("rechaza organizationId con caracteres no hexadecimales", () => {
  probarError("organizationId no hexadecimal", { ...cuerpoValido(), organizationId: "64b7f0c2a1b2c3d4e5f6071z" });
});

test("rechaza organizationId de 12 caracteres", () => {
  probarError("organizationId de 12 caracteres", { ...cuerpoValido(), organizationId: "abcdefghijkl" });
});

test("rechaza targetAmount cero", () => {
  probarError("targetAmount cero", { ...cuerpoValido(), targetAmount: 0 });
});

test("rechaza targetAmount negativo", () => {
  probarError("targetAmount negativo", { ...cuerpoValido(), targetAmount: -100 });
});

test("rechaza status fuera de los valores permitidos", () => {
  probarError("status inválido", { ...cuerpoValido(), status: "finalizada" });
});

test("acepta title omitido en modo update", () => {
  const entrada = { description: "Descripción actualizada" };
  const resultado = ejecutarValidador(entrada, "update");
  mostrarResultado("title omitido en update", entrada, resultado);

  assert.equal(resultado.siguienteLlamado, true);
  assert.equal(resultado.respuesta, undefined);
});

test("rechaza title omitido en modo create", () => {
  probarError("title omitido en create", {
    description: "Descripción válida",
    targetAmount: 100000,
    organizationId: ORG_ID
  });
});

test("rechaza description omitida en modo create", () => {
  probarError("description omitida en create", {
    title: "Campaña válida",
    targetAmount: 100000,
    organizationId: ORG_ID
  });
});

test("rechaza targetAmount omitido en modo create", () => {
  probarError("targetAmount omitido en create", {
    title: "Campaña válida",
    description: "Descripción válida",
    organizationId: ORG_ID
  });
});

test("rechaza organizationId omitido en modo create", () => {
  probarError("organizationId omitido en create", {
    title: "Campaña válida",
    description: "Descripción válida",
    targetAmount: 100000
  });
});

test("acepta status omitido porque es opcional", () => {
  const entrada = { ...cuerpoValido() };
  delete entrada.status;
  const resultado = ejecutarValidador(entrada);
  mostrarResultado("status omitido", entrada, resultado);

  assert.equal(resultado.siguienteLlamado, true);
  assert.equal(resultado.respuesta, undefined);
});
