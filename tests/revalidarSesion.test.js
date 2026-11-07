import { test, afterEach } from "node:test";
import assert from "node:assert/strict";

import User from "../models/User.js";
import { revalidarUsuarioDeSesion } from "../middlewares/auth.js";

/**
 * REVALIDACIÓN DE LA SESIÓN: una baja o un cambio de rol rigen en el próximo pedido.
 * User.findById se reemplaza por una versión simulada: no hace falta MongoDB.
 */

const findByIdOriginal = User.findById;
afterEach(() => {
  User.findById = findByIdOriginal;
});

function pedidoConSesion(usuario) {
  const req = {
    session: {
      user: usuario,
      destroy(callback) {
        delete req.session;
        callback();
      }
    }
  };
  return req;
}

function ejecutar(req) {
  return new Promise((resolve) => {
    revalidarUsuarioDeSesion(req, {}, (err) => resolve(err));
  });
}

const enSesion = { id: "u1", username: "ana", name: "Ana", email: "ana@x.org", role: "administrador" };

test("sin sesión no consulta la base y deja pasar", async () => {
  User.findById = async () => assert.fail("no debería consultar la base");
  const err = await ejecutar({ session: {} });
  assert.equal(err, undefined);
});

test("si el usuario fue dado de baja, la sesión se borra y sigue como visitante", async () => {
  User.findById = async () => null; // el borrado lógico lo excluye de las consultas
  const req = pedidoConSesion({ ...enSesion });
  const err = await ejecutar(req);
  assert.equal(err, undefined);
  assert.equal(req.session, undefined);
});

test("si le cambiaron el rol, la sesión toma el rol actual", async () => {
  User.findById = async () => ({ ...enSesion, role: "auditoria" });
  const req = pedidoConSesion({ ...enSesion });
  await ejecutar(req);
  assert.equal(req.session.user.role, "auditoria");
});

test("si la base falla, el error se delega al manejador de errores", async () => {
  User.findById = async () => {
    throw new Error("base caída");
  };
  const err = await ejecutar(pedidoConSesion({ ...enSesion }));
  assert.equal(err.message, "base caída");
});
