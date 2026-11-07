import { test } from "node:test";
import assert from "node:assert/strict";

import { permisosDe } from "../middlewares/auth.js";

/**
 * PERMISOS DE LAS PÁGINAS: qué formularios y botones ve cada rol. Tiene que coincidir con
 * los hasRole de la API (las páginas sólo ofrecen lo que la API después acepta).
 */

test("sin sesión no se ofrece ninguna gestión", () => {
  const p = permisosDe(null);
  assert.deepEqual(
    [p.organizaciones, p.campanias, p.eliminarCampanias, p.donantes, p.donaciones],
    [false, false, false, false, false]
  );
});

test("superadmin y administrador gestionan todo", () => {
  for (const role of ["superadmin", "administrador"]) {
    const p = permisosDe({ role });
    assert.equal(p.organizaciones && p.campanias && p.eliminarCampanias && p.donantes && p.donaciones, true, role);
    assert.equal(p.organizacionPropia, null);
  }
});

test("auditoria sólo consulta", () => {
  const p = permisosDe({ role: "auditoria" });
  assert.equal(p.organizaciones || p.campanias || p.eliminarCampanias || p.donantes || p.donaciones, false);
});

test("el referente gestiona campañas de su organización, sin eliminar, y nada más", () => {
  const p = permisosDe({ role: "organizacion", organizationId: "64b7f0c2a1b2c3d4e5f60001" });
  assert.equal(p.campanias, true);
  assert.equal(p.eliminarCampanias, false);
  assert.equal(p.organizacionPropia, "64b7f0c2a1b2c3d4e5f60001");
  assert.equal(p.organizaciones || p.donantes || p.donaciones, false);
});
