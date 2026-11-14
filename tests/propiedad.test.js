import { test, afterEach } from "node:test";
import assert from "node:assert/strict";

import Campaign from "../models/Campaign.js";
import { restringirAOrganizacionPropia } from "../middlewares/propiedad.js";

/**
 * CONTROL POR PROPIEDAD en campañas: el referente (rol organizacion) gestiona sólo
 * las campañas de su organización. Campaign.findById se simula: no hace falta MongoDB.
 */

const PROPIA = "64b7f0c2a1b2c3d4e5f60001";
const AJENA = "64b7f0c2a1b2c3d4e5f60002";

const findByIdOriginal = Campaign.findById;
afterEach(() => {
  Campaign.findById = findByIdOriginal;
});

async function ejecutar({ role = "organizacion", organizationId = PROPIA, method = "POST", body = {}, campania = null }) {
  Campaign.findById = async () => campania;
  const req = { method, body, params: { id: "64b7f0c2a1b2c3d4e5f6abcd" }, session: { user: { role, organizationId } } };
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
  // El middleware es async: se espera a que termine, haya llamado a next o respondido.
  let siguio = false;
  await restringirAOrganizacionPropia(req, res, () => {
    siguio = true;
  });
  return { req, res, siguio };
}

test("los demás roles no se ven afectados", async () => {
  const { siguio } = await ejecutar({ role: "administrador", organizationId: null, body: { organizationId: AJENA } });
  assert.equal(siguio, true);
});

test("alta sin organización: se usa la del referente", async () => {
  const { siguio, req } = await ejecutar({ body: { title: "x" } });
  assert.equal(siguio, true);
  assert.equal(req.body.organizationId, PROPIA);
});

test("alta para otra organización: 403", async () => {
  const { siguio, res } = await ejecutar({ body: { organizationId: AJENA } });
  assert.equal(siguio, false);
  assert.equal(res.codigo, 403);
});

test("edición de una campaña de su organización: permitida", async () => {
  const { siguio } = await ejecutar({ method: "PUT", campania: { organizationId: PROPIA } });
  assert.equal(siguio, true);
});

test("edición de una campaña ajena: 403", async () => {
  const { siguio, res } = await ejecutar({ method: "PUT", campania: { organizationId: AJENA } });
  assert.equal(siguio, false);
  assert.equal(res.codigo, 403);
});

test("edición que intenta pasar la campaña a otra organización: 403", async () => {
  const { res } = await ejecutar({ method: "PUT", body: { organizationId: AJENA }, campania: { organizationId: PROPIA } });
  assert.equal(res.codigo, 403);
});

test("referente sin organización asignada: 403", async () => {
  const { res } = await ejecutar({ organizationId: null });
  assert.equal(res.codigo, 403);
});
