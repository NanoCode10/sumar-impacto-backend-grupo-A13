import { test } from "node:test";
import assert from "node:assert/strict";

import { validateUser, validateLogin } from "../middlewares/validateBody.js";
import { validateUserQuery } from "../middlewares/validateQuery.js";

// Ejecuta un middleware con un req/res de prueba y devuelve lo que respondió.
function ejecutar(middleware, body, query = {}) {
  const req = { body, query };
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

  middleware(req, res, () => {
    siguienteLlamado = true;
  });

  return { req, respuesta, siguienteLlamado };
}

function usuarioValido() {
  return {
    username: "mgarcia",
    name: "María García",
    email: "maria@sumarimpacto.org",
    password: "clave-segura",
    role: "auditoria"
  };
}

function probarError(middleware, body, mensaje) {
  const resultado = ejecutar(middleware, body);
  assert.equal(resultado.siguienteLlamado, false);
  assert.equal(resultado.respuesta.codigo, 400);
  if (mensaje) {
    assert.match(resultado.respuesta.body.error, mensaje);
  }
}

// ---------------------------------------------------------------------------
// validateUser
// ---------------------------------------------------------------------------

test("validateUser acepta un usuario válido y normaliza username, email y role", () => {
  const body = { ...usuarioValido(), username: " MGarcia ", email: " maria@sumarimpacto.org ", role: "AUDITORIA" };

  const { req, siguienteLlamado } = ejecutar(validateUser("create"), body);

  assert.equal(siguienteLlamado, true);
  assert.equal(req.body.username, "mgarcia");
  assert.equal(req.body.email, "maria@sumarimpacto.org");
  assert.equal(req.body.role, "auditoria");
});

test("validateUser acepta el rol omitido (el modelo pone el de menos permisos)", () => {
  const { role, ...body } = usuarioValido();
  assert.equal(ejecutar(validateUser("create"), body).siguienteLlamado, true);
});

test("validateUser exige los campos obligatorios en modo create", () => {
  probarError(validateUser("create"), { username: "pepe" }, /Faltan campos obligatorios: name, email, password/);
});

test("validateUser rechaza un username con @, espacios o muy corto", () => {
  for (const username of ["pe@pe", "pepe garcía", "pe", 123]) {
    probarError(validateUser("create"), { ...usuarioValido(), username }, /username/);
  }
});

test("validateUser rechaza un email con formato inválido", () => {
  probarError(validateUser("create"), { ...usuarioValido(), email: "maria@" }, /email/);
});

test("validateUser rechaza una contraseña de menos de 8 caracteres o que no es texto", () => {
  probarError(validateUser("create"), { ...usuarioValido(), password: "1234567" }, /al menos 8/);
  probarError(validateUser("create"), { ...usuarioValido(), password: 12345678 }, /al menos 8/);
});

test("validateUser no recorta la contraseña: los espacios son parte de ella", () => {
  const body = { ...usuarioValido(), password: " clave con espacios " };
  const { req } = ejecutar(validateUser("create"), body);
  assert.equal(req.body.password, " clave con espacios ");
});

test("validateUser rechaza un rol fuera de la lista", () => {
  probarError(validateUser("create"), { ...usuarioValido(), role: "rey" }, /role inválido/);
});

// ---------------------------------------------------------------------------
// validateLogin
// ---------------------------------------------------------------------------

test("validateLogin acepta usuario y contraseña, sin exigir largo", () => {
  assert.equal(ejecutar(validateLogin, { usuario: "admin", password: "corta" }).siguienteLlamado, true);
});

test("validateLogin exige usuario y password", () => {
  probarError(validateLogin, {}, /Faltan campos obligatorios: usuario, password/);
  probarError(validateLogin, { usuario: "admin" }, /password/);
});

test("validateLogin rechaza valores que no son texto", () => {
  probarError(validateLogin, { usuario: "admin", password: 12345678 }, /deben ser textos/);
});

// ---------------------------------------------------------------------------
// Edición y filtro de usuarios
// ---------------------------------------------------------------------------

test("validateUser en modo update rechaza cambiar el username", () => {
  probarError(validateUser("update"), { username: "otro" }, /username no se puede modificar/);
});

test("validateUser en modo update acepta sólo los campos enviados, sin contraseña", () => {
  assert.equal(ejecutar(validateUser("update"), { role: "administrador" }).siguienteLlamado, true);
});

test("validateUserQuery normaliza el rol y rechaza uno inexistente", () => {
  const ok = ejecutar(validateUserQuery, undefined, { role: "AUDITORIA" });
  assert.deepEqual(ok.req.filtros, { role: "auditoria" });

  const mal = ejecutar(validateUserQuery, undefined, { role: "rey" });
  assert.equal(mal.respuesta.codigo, 400);
});
