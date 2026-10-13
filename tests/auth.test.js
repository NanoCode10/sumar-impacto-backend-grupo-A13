import { test } from "node:test";
import assert from "node:assert/strict";

import { requireLogin, requireRole, exponerUsuario } from "../middlewares/auth.js";
import { validateUser } from "../middlewares/validateBody.js";
import { validateUserQuery } from "../middlewares/validateQuery.js";

/**
 * Middlewares de sesión y permisos, sin servidor ni base: se simulan req y res.
 */

function ejecutar(middleware, { url = "/api/organizations", user, body, query } = {}) {
  const req = { originalUrl: url, session: user ? { user } : {}, body, query: query ?? {} };
  const resultado = { siguiente: false, error: undefined, redireccion: undefined, respuesta: undefined };
  const res = {
    locals: {},
    redirect(destino) {
      resultado.redireccion = destino;
    },
    status(codigo) {
      resultado.respuesta = { codigo };
      return this;
    },
    json(data) {
      resultado.respuesta.body = data;
      return this;
    }
  };

  middleware(req, res, (err) => {
    resultado.siguiente = true;
    resultado.error = err;
  });
  return { ...resultado, req, res };
}

const superadmin = { id: "1", username: "superadmin", role: "superadmin" };
const auditoria = { id: "2", username: "auditoria", role: "auditoria" };

// ---------------------------------------------------------------------------
// requireLogin y requireRole
// ---------------------------------------------------------------------------

test("requireLogin sin sesión en la API delega un 401", () => {
  const { error } = ejecutar(requireLogin);
  assert.equal(error.statusCode, 401);
});

test("requireLogin sin sesión en una página redirige al login recordando el destino", () => {
  const { redireccion, siguiente } = ejecutar(requireLogin, { url: "/organizations" });
  assert.equal(siguiente, false);
  assert.equal(redireccion, "/login?volver=%2Forganizations");
});

test("requireLogin con sesión deja pasar", () => {
  const { siguiente, error } = ejecutar(requireLogin, { user: auditoria });
  assert.equal(siguiente, true);
  assert.equal(error, undefined);
});

test("requireRole con un rol no incluido delega un 403", () => {
  const { error } = ejecutar(requireRole("superadmin", "administrador"), { user: auditoria });
  assert.equal(error.statusCode, 403);
});

test("requireRole con el rol incluido deja pasar", () => {
  const { siguiente, error } = ejecutar(requireRole("superadmin"), { user: superadmin });
  assert.equal(siguiente, true);
  assert.equal(error, undefined);
});

test("requireRole sin sesión responde como requireLogin (401)", () => {
  const { error } = ejecutar(requireRole("superadmin"));
  assert.equal(error.statusCode, 401);
});

// ---------------------------------------------------------------------------
// exponerUsuario (lo que ve el menú)
// ---------------------------------------------------------------------------

test("exponerUsuario deja el usuario y si puede gestionar en res.locals", () => {
  assert.deepEqual(ejecutar(exponerUsuario, { user: superadmin }).res.locals, {
    usuario: superadmin,
    puedeGestionar: true
  });
  assert.equal(ejecutar(exponerUsuario, { user: auditoria }).res.locals.puedeGestionar, false);
  assert.deepEqual(ejecutar(exponerUsuario).res.locals, { usuario: null, puedeGestionar: false });
});

// ---------------------------------------------------------------------------
// Validación de la edición y del filtro de usuarios
// ---------------------------------------------------------------------------

test("validateUser en modo update rechaza cambiar el username", () => {
  const { respuesta, siguiente } = ejecutar(validateUser("update"), { body: { username: "otro" } });
  assert.equal(siguiente, false);
  assert.equal(respuesta.codigo, 400);
  assert.equal(respuesta.body.error, "username no se puede modificar");
});

test("validateUser en modo update acepta sólo los campos enviados, sin contraseña", () => {
  assert.equal(ejecutar(validateUser("update"), { body: { role: "administrador" } }).siguiente, true);
});

test("validateUserQuery normaliza el rol y rechaza uno inexistente", () => {
  const ok = ejecutar(validateUserQuery, { query: { role: "AUDITORIA" } });
  assert.deepEqual(ok.req.filtros, { role: "auditoria" });

  const mal = ejecutar(validateUserQuery, { query: { role: "rey" } });
  assert.equal(mal.respuesta.codigo, 400);
});
