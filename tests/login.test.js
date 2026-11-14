import { test, afterEach } from "node:test";
import assert from "node:assert/strict";

import User from "../models/User.js";
import { login } from "../controllers/authController.js";

/**
 * LOGIN: la sesión se regenera (identificador nuevo) antes de guardar el usuario,
 * contra la fijación de sesión. User.verificarCredenciales se simula: no hace falta MongoDB.
 */

const verificarOriginal = User.verificarCredenciales;
afterEach(() => {
  User.verificarCredenciales = verificarOriginal;
});

function pedido() {
  const req = {
    body: { usuario: "ana", password: "clave12345" },
    session: {
      id: "identificador-viejo",
      regenerate(callback) {
        req.session = { id: "identificador-nuevo", regenerate: this.regenerate };
        callback();
      }
    }
  };
  return req;
}

function respuesta() {
  const res = {
    status(codigo) {
      res.codigo = codigo;
      return res;
    },
    json(datos) {
      res.datos = datos;
      return res;
    }
  };
  return res;
}

test("con credenciales correctas, regenera la sesión y guarda el usuario en la nueva", async () => {
  User.verificarCredenciales = async () => ({ id: "u1", username: "ana", name: "Ana", email: "a@x.org", role: "auditoria" });
  const req = pedido();
  const res = respuesta();
  await login(req, res, assert.fail);
  assert.equal(res.codigo, 200);
  assert.equal(req.session.id, "identificador-nuevo");
  assert.equal(req.session.user.role, "auditoria");
});

test("con credenciales incorrectas responde 401 y no toca la sesión", async () => {
  User.verificarCredenciales = async () => null;
  const req = pedido();
  const res = respuesta();
  await login(req, res, assert.fail);
  assert.equal(res.codigo, 401);
  assert.equal(req.session.id, "identificador-viejo");
  assert.equal(req.session.user, undefined);
});
