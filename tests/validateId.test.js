const { test } = require("node:test");
const assert = require("node:assert/strict");

const validateId = require("../middlewares/validateId");

const MENSAJE_ID_INVALIDO = "El id debe ser un número entero positivo";

// validateId no responde con res.status().json(): ante un id inválido crea un
// Error con statusCode 400 y lo delega con next(err) al errorHandler global.
// Por eso el mock de next distingue next() (continuar) de next(err) (error delegado).
function ejecutarValidador(id) {
  const req = {
    params: { id }
  };
  let respuesta;
  let siguienteLlamado = false;
  let errorCapturado;

  const res = {
    status(codigo) {
      respuesta = { codigo };
      return this;
    },
    json(body) {
      respuesta.body = body;
      return this;
    }
  };

  const next = (err) => {
    if (err) {
      errorCapturado = err;
    } else {
      siguienteLlamado = true;
    }
  };

  validateId(req, res, next);

  return { respuesta, siguienteLlamado, errorCapturado };
}

function mostrarResultado(nombre, entrada, resultado) {
  console.log(`\n${nombre}`);
  console.log("ID ingresado:", JSON.stringify(entrada));
  console.log("¿Se llamó a next() sin error?:", resultado.siguienteLlamado);
  console.log("Status del error delegado:", resultado.errorCapturado?.statusCode ?? "sin error");
  console.log("Mensaje del error delegado:", resultado.errorCapturado?.message ?? "sin error");
}

function probarValido(nombre, entrada) {
  const resultado = ejecutarValidador(entrada);
  mostrarResultado(nombre, entrada, resultado);

  assert.equal(resultado.siguienteLlamado, true);
  assert.equal(resultado.errorCapturado, undefined);
  assert.equal(resultado.respuesta, undefined);
}

function probarInvalido(nombre, entrada) {
  const resultado = ejecutarValidador(entrada);
  mostrarResultado(nombre, entrada, resultado);

  assert.equal(resultado.siguienteLlamado, false);
  assert.ok(resultado.errorCapturado instanceof Error);
  assert.equal(resultado.errorCapturado.statusCode, 400);
  assert.equal(resultado.errorCapturado.message, MENSAJE_ID_INVALIDO);
  // La respuesta la arma el errorHandler, no el middleware.
  assert.equal(resultado.respuesta, undefined);
}

test("acepta un ID entero positivo", () => {
  probarValido("ID entero positivo", "1");
});

test("acepta un ID entero positivo mayor", () => {
  probarValido("ID entero positivo mayor", "250");
});

test("rechaza el ID cero", () => {
  probarInvalido("ID cero", "0");
});

test("rechaza un ID negativo", () => {
  probarInvalido("ID negativo", "-1");
});

test("rechaza un ID decimal", () => {
  probarInvalido("ID decimal", "1.5");
});

test("rechaza un ID con letras", () => {
  probarInvalido("ID con letras", "abc");
});

test("rechaza un ID vacío", () => {
  probarInvalido("ID vacío", "");
});

test("rechaza un ID null", () => {
  probarInvalido("ID null", null);
});

test("rechaza un ID undefined", () => {
  probarInvalido("ID undefined", undefined);
});
