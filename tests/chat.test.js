import { test } from "node:test";
import assert from "node:assert/strict";

import {
  validarMensaje,
  preguntaParaAsistente,
  crearCupo,
  crearPresencia,
  diaArgentina,
  LARGO_MAXIMO
} from "../sockets/chat.js";
import { crearAsistente, conTiempoMaximo } from "../services/asistente.js";

/**
 * CHAT: las reglas que se aplican a lo que llega por el socket. No hace falta ni
 * MongoDB ni Gemini: son funciones sin efectos.
 */

test("validarMensaje acepta texto, lo recorta, y rechaza vacío, largo excesivo y no-texto", () => {
  assert.equal(validarMensaje("  hola  "), "hola");
  assert.equal(validarMensaje("   "), null);
  assert.equal(validarMensaje("x".repeat(LARGO_MAXIMO + 1)), null);
  assert.equal(validarMensaje("x".repeat(LARGO_MAXIMO)), "x".repeat(LARGO_MAXIMO));
  assert.equal(validarMensaje({ texto: "hola" }), null);
  assert.equal(validarMensaje(undefined), null);
});

test("preguntaParaAsistente detecta el prefijo @gemini (sin importar mayúsculas) y devuelve la pregunta", () => {
  assert.equal(preguntaParaAsistente("@gemini ¿Qué es una rendición?"), "¿Qué es una rendición?");
  assert.equal(preguntaParaAsistente("@Gemini hola"), "hola");
  assert.equal(preguntaParaAsistente("@gemini   "), null);
  assert.equal(preguntaParaAsistente("hola @gemini"), null);
});

// Para los tests del cupo, el "día" es la hora (en ms) dividida por un día: controlable.
const DIA_MS = 24 * 60 * 60 * 1000;
const diaDePrueba = (fecha) => String(Math.floor(fecha.getTime() / DIA_MS));

test("cupo: una consulta cada tanto tiempo por usuario, y cada usuario tiene su cuenta", () => {
  const cupo = crearCupo({ esperaMs: 15000, porUsuarioPorDia: 10, totalPorDia: 50 }, diaDePrueba);
  assert.equal(cupo.consumir("ana", 0).ok, true);
  assert.match(cupo.consumir("ana", 10000).motivo, /Esperá unos segundos/);
  assert.equal(cupo.consumir("beto", 10000).ok, true);
  assert.equal(cupo.consumir("ana", 15000).ok, true);
});

test("cupo: tope diario por usuario y tope diario total; al cambiar el día se renuevan", () => {
  const cupo = crearCupo({ esperaMs: 0, porUsuarioPorDia: 2, totalPorDia: 3 }, diaDePrueba);
  assert.equal(cupo.consumir("ana", 1).ok, true);
  assert.equal(cupo.consumir("ana", 2).ok, true);
  assert.match(cupo.consumir("ana", 3).motivo, /límite de 2 consultas diarias/);

  assert.equal(cupo.consumir("beto", 4).ok, true); // tercera del día: llega al total
  assert.match(cupo.consumir("carla", 5).motivo, /límite de consultas por hoy/);

  assert.equal(cupo.consumir("ana", DIA_MS + 1).ok, true, "día nuevo: se renueva");
});

test("el día del cupo es el de Argentina, no el de UTC (a las 22 h de Argentina sigue siendo hoy)", () => {
  // 7/11/2026 22:30 en Argentina = 8/11/2026 01:30 UTC
  assert.equal(diaArgentina(new Date("2026-11-08T01:30:00Z")), "2026-11-07");
});

test("conTiempoMaximo deja de esperar a una respuesta que no llega", async () => {
  const nuncaResponde = new Promise(() => {});
  await assert.rejects(conTiempoMaximo(nuncaResponde, 50), /no respondió en/);
  assert.equal(await conTiempoMaximo(Promise.resolve("ok"), 50), "ok");
});

test("sin GEMINI_API_KEY el asistente queda no configurado y no consulta a nadie", async () => {
  const asistente = crearAsistente({ apiKey: "" });
  assert.equal(asistente.configurado, false);
  await assert.rejects(asistente.responder("hola"), /no está configurado/);
});

test("crearPresencia cuenta personas, no conexiones: dos pestañas o una recarga no generan avisos", () => {
  const presencia = crearPresencia();

  assert.equal(presencia.entrar("ana"), true, "primera conexión de ana: se avisa");
  assert.equal(presencia.entrar("ana"), false, "segunda pestaña de ana: no se avisa");
  assert.equal(presencia.usuarios, 1);

  // Recarga: la conexión nueva llega antes de que se cierre la vieja.
  assert.equal(presencia.salir("ana"), false, "cierra una pestaña pero sigue conectada: no se avisa");
  assert.equal(presencia.usuarios, 1);

  assert.equal(presencia.entrar("beto"), true);
  assert.equal(presencia.usuarios, 2);

  assert.equal(presencia.salir("ana"), true, "cierra la última conexión: se avisa");
  assert.equal(presencia.usuarios, 1);
});
