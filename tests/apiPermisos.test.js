import { test, before, after } from "node:test";
import assert from "node:assert/strict";

import express from "express";

import apiRoutes, { RECURSOS } from "../routes/apiRoutes.js";
import { esRutaPublica } from "../middlewares/auth.js";

/**
 * DENEGAR POR DEFECTO: recorre TODAS las rutas que monta routes/apiRoutes.js y
 * comprueba que, sin sesión, las que no están declaradas públicas respondan 401.
 *
 * Si alguien agrega una ruta o un recurso y queda abierto, este test falla.
 * No necesita MongoDB: el control responde antes de llegar al controlador.
 */

const ID_EJEMPLO = "64b7f0c2a1b2c3d4e5f60718";
let servidor;
let base;

before(async () => {
  const app = express();
  app.use(express.json());
  app.use("/api", apiRoutes);
  await new Promise((resolve) => {
    servidor = app.listen(0, resolve);
  });
  base = `http://127.0.0.1:${servidor.address().port}/api`;
});

after(() => servidor.close());

function rutasDeLaApi() {
  const rutas = [];
  for (const [prefijo, recurso] of Object.entries(RECURSOS)) {
    for (const capa of recurso.stack) {
      if (!capa.route) continue;
      for (const metodo of Object.keys(capa.route.methods)) {
        const ruta = `${prefijo}${capa.route.path === "/" ? "" : capa.route.path}`;
        rutas.push({ metodo: metodo.toUpperCase(), ruta: ruta.replace(":id", ID_EJEMPLO) });
      }
    }
  }
  return rutas;
}

test("la API tiene rutas para revisar (si queda vacía, el recorrido no prueba nada)", () => {
  assert.ok(rutasDeLaApi().length > 20);
});

test("sin sesión, toda ruta no pública de la API responde 401", async () => {
  const abiertas = [];
  for (const { metodo, ruta } of rutasDeLaApi()) {
    if (esRutaPublica(metodo, ruta)) continue;
    const respuesta = await fetch(base + ruta, {
      method: metodo,
      headers: { "Content-Type": "application/json" },
      body: metodo === "GET" ? undefined : "{}"
    });
    if (respuesta.status !== 401) abiertas.push(`${metodo} /api${ruta} -> ${respuesta.status}`);
  }
  assert.deepEqual(abiertas, [], `Rutas abiertas sin sesión:\n${abiertas.join("\n")}`);
});

test("las rutas públicas son sólo las consultas de organizaciones y campañas, y el login", () => {
  assert.equal(esRutaPublica("GET", "/organizations"), true);
  assert.equal(esRutaPublica("GET", `/campaigns/${ID_EJEMPLO}`), true);
  assert.equal(esRutaPublica("POST", "/auth/login"), true);
  assert.equal(esRutaPublica("POST", "/organizations"), false);
  assert.equal(esRutaPublica("GET", "/donors"), false);
  assert.equal(esRutaPublica("GET", "/users"), false);
  assert.equal(esRutaPublica("GET", "/organizationsX"), false);
});
