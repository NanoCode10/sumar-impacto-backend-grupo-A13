import { test } from "node:test";
import assert from "node:assert/strict";

import { isAuthenticated, hasRole } from "../middlewares/auth.js";

function ejecutarMiddleware(middleware, session = null) {
  const req = { session };
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

test("isAuthenticated permite continuar a un usuario con sesión activa", () => {
  const session = { user: { id: "123", username: "superadmin", role: "superadmin" } };
  const resultado = ejecutarMiddleware(isAuthenticated, session);

  assert.equal(resultado.siguienteLlamado, true);
  assert.equal(resultado.respuesta, undefined);
});

test("isAuthenticated responde 401 si no hay sesión o no hay usuario", () => {
  const sinSesion = ejecutarMiddleware(isAuthenticated, null);
  assert.equal(sinSesion.siguienteLlamado, false);
  assert.equal(sinSesion.respuesta.codigo, 401);

  const conSesionVacia = ejecutarMiddleware(isAuthenticated, {});
  assert.equal(conSesionVacia.siguienteLlamado, false);
  assert.equal(conSesionVacia.respuesta.codigo, 401);
});

test("hasRole permite continuar si el rol coincide", () => {
  const session = { user: { role: "superadmin" } };
  const resultado = ejecutarMiddleware(hasRole("superadmin", "administrador"), session);

  assert.equal(resultado.siguienteLlamado, true);
  assert.equal(resultado.respuesta, undefined);
});

test("hasRole responde 403 si el rol no tiene permisos", () => {
  const session = { user: { role: "organizacion" } };
  const resultado = ejecutarMiddleware(hasRole("superadmin", "administrador"), session);

  assert.equal(resultado.siguienteLlamado, false);
  assert.equal(resultado.respuesta.codigo, 403);
  assert.match(resultado.respuesta.body.error, /Acceso denegado/);
});

