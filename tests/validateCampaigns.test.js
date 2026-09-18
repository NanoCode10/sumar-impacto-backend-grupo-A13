const { test } = require("node:test");
const assert = require("node:assert/strict");

const { validateCampaign } = require("../middlewares/validateBody");

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

// validateBody exige el tipo real del JSON: los números llegan como number y no
// se convierten desde string. Sólo se normalizan textos (trim) y el status (canónico).
test("acepta una campaña válida y normaliza textos y estado", () => {
  const entrada = {
    title: " Campaña de alimentos ",
    description: " Compra de alimentos para el comedor ",
    targetAmount: 250000,
    organizationId: 1,
    status: "ACTIVA"
  };
  const resultado = ejecutarValidador(entrada);
  mostrarResultado("Campaña válida", entrada, resultado);

  assert.equal(resultado.siguienteLlamado, true);
  assert.equal(resultado.respuesta, undefined);
  assert.equal(resultado.req.body.title, "Campaña de alimentos");
  assert.equal(resultado.req.body.description, "Compra de alimentos para el comedor");
  assert.equal(resultado.req.body.targetAmount, 250000);
  assert.equal(resultado.req.body.organizationId, 1);
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

test("rechaza organizationId alfanumérico no convertible", () => {
  probarError("organizationId alfanumérico", { ...cuerpoValido(), organizationId: "abc" });
});

test("rechaza targetAmount numérico enviado como string", () => {
  const resultado = probarError("targetAmount como string", { ...cuerpoValido(), targetAmount: "250000" });
  assert.equal(resultado.respuesta.body.error, "targetAmount debe ser un número mayor a 0");
});

test("rechaza organizationId numérico enviado como string", () => {
  const resultado = probarError("organizationId como string", { ...cuerpoValido(), organizationId: "1" });
  assert.equal(resultado.respuesta.body.error, "organizationId debe ser un número entero positivo");
});

test("rechaza organizationId negativo", () => {
  probarError("organizationId negativo", { ...cuerpoValido(), organizationId: -1 });
});

test("rechaza organizationId cero", () => {
  probarError("organizationId cero", { ...cuerpoValido(), organizationId: 0 });
});

test("rechaza organizationId decimal", () => {
  probarError("organizationId decimal", { ...cuerpoValido(), organizationId: 1.5 });
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
    organizationId: 1
  });
});

test("rechaza description omitida en modo create", () => {
  probarError("description omitida en create", {
    title: "Campaña válida",
    targetAmount: 100000,
    organizationId: 1
  });
});

test("rechaza targetAmount omitido en modo create", () => {
  probarError("targetAmount omitido en create", {
    title: "Campaña válida",
    description: "Descripción válida",
    organizationId: 1
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
