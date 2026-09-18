const { test } = require("node:test");
const assert = require("node:assert/strict");

const { validateOrganization } = require("../middlewares/validateBody");

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

  validateOrganization(mode)(req, res, next);

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
    name: "Fundación Verde",
    type: "fundación",
    email: "contacto@verde.org",
    status: "aprobada"
  };
}

function probarError(nombre, entrada) {
  const resultado = ejecutarValidador(entrada);
  mostrarResultado(nombre, entrada, resultado);

  assert.equal(resultado.siguienteLlamado, false);
  assert.equal(resultado.respuesta.codigo, 400);
  return resultado;
}

test("acepta una organización válida y normaliza sus valores", () => {
  const entrada = {
    name: " Fundación Verde ",
    type: "FUNDACION",
    email: " contacto@verde.org ",
    status: "APROBADA"
  };
  const resultado = ejecutarValidador(entrada);
  mostrarResultado("Organización válida", entrada, resultado);

  assert.equal(resultado.siguienteLlamado, true);
  assert.equal(resultado.respuesta, undefined);
  assert.equal(resultado.req.body.name, "Fundación Verde");
  assert.equal(resultado.req.body.type, "fundación");
  assert.equal(resultado.req.body.email, "contacto@verde.org");
  assert.equal(resultado.req.body.status, "aprobada");
});

test("rechaza name null", () => {
  probarError("name null", { ...cuerpoValido(), name: null });
});

test("rechaza type null", () => {
  probarError("type null", { ...cuerpoValido(), type: null });
});

test("rechaza email null", () => {
  probarError("email null", { ...cuerpoValido(), email: null });
});

test("rechaza status null", () => {
  probarError("status null", { ...cuerpoValido(), status: null });
});

test("rechaza name menor a tres caracteres", () => {
  probarError("name demasiado corto", { ...cuerpoValido(), name: "AB" });
});

test("rechaza name mayor a cien caracteres", () => {
  probarError("name demasiado largo", { ...cuerpoValido(), name: "A".repeat(101) });
});

test("rechaza name vacío o con espacios", () => {
  probarError("name con espacios", { ...cuerpoValido(), name: "   " });
});

test("rechaza un email con formato inválido", () => {
  probarError("email inválido", { ...cuerpoValido(), email: "correo-invalido" });
});

test("rechaza un email vacío", () => {
  probarError("email vacío", { ...cuerpoValido(), email: "" });
});

test("rechaza type fuera de los valores permitidos", () => {
  probarError("type inválido", { ...cuerpoValido(), type: "empresa" });
});

test("rechaza status fuera de los valores permitidos", () => {
  probarError("status inválido", { ...cuerpoValido(), status: "inactiva" });
});

test("rechaza name omitido en modo create", () => {
  const entrada = { type: "ONG", email: "ong@example.org" };
  probarError("name omitido en create", entrada);
});

test("rechaza type omitido en modo create", () => {
  const entrada = { name: "ONG Raíces", email: "ong@example.org" };
  probarError("type omitido en create", entrada);
});

test("rechaza email omitido en modo create", () => {
  const entrada = { name: "ONG Raíces", type: "ONG" };
  probarError("email omitido en create", entrada);
});

test("acepta status omitido porque es opcional", () => {
  const entrada = { ...cuerpoValido() };
  delete entrada.status;
  const resultado = ejecutarValidador(entrada);
  mostrarResultado("status omitido", entrada, resultado);

  assert.equal(resultado.siguienteLlamado, true);
  assert.equal(resultado.respuesta, undefined);
});

test("acepta campos opcionales omitidos en modo update", () => {
  const entrada = { name: "Nombre actualizado" };
  const resultado = ejecutarValidador(entrada, "update");
  mostrarResultado("campos omitidos en update", entrada, resultado);

  assert.equal(resultado.siguienteLlamado, true);
  assert.equal(resultado.respuesta, undefined);
});
