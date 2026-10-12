import { test } from "node:test";
import assert from "node:assert/strict";

import validateId from "../middlewares/validateId.js";

const MENSAJE_ID_INVALIDO = "El id debe ser un ObjectId válido (24 caracteres hexadecimales)";

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

// Los ids son ObjectId de MongoDB: 24 caracteres hexadecimales.
test("acepta un ObjectId válido", () => {
  probarValido("ObjectId válido", "64b7f0c2a1b2c3d4e5f60718");
});

test("acepta un ObjectId en mayúsculas", () => {
  probarValido("ObjectId en mayúsculas", "64B7F0C2A1B2C3D4E5F60718");
});

test("rechaza un ID numérico (formato anterior)", () => {
  probarInvalido("ID numérico", "1");
});

test("rechaza un ID de 23 caracteres", () => {
  probarInvalido("ID de 23 caracteres", "64b7f0c2a1b2c3d4e5f6071");
});

test("rechaza un ID de 25 caracteres", () => {
  probarInvalido("ID de 25 caracteres", "64b7f0c2a1b2c3d4e5f607180");
});

test("rechaza un ID con caracteres no hexadecimales", () => {
  probarInvalido("ID no hexadecimal", "64b7f0c2a1b2c3d4e5f6071z");
});

// mongoose.Types.ObjectId.isValid aceptaría este caso: por eso no se usa.
test("rechaza un texto de 12 caracteres", () => {
  probarInvalido("ID de 12 caracteres", "abcdefghijkl");
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
