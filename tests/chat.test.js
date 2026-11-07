import { test } from "node:test";
import assert from "node:assert/strict";

import { validarMensaje, preguntaParaAsistente, crearLimitador, LARGO_MAXIMO } from "../sockets/chat.js";
import { crearAsistente } from "../services/asistente.js";

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

test("crearLimitador permite una consulta por usuario cada tanto tiempo, y cada usuario tiene su cuenta", () => {
  const limitador = crearLimitador(15000);
  assert.equal(limitador.puede("ana", 0), true);
  assert.equal(limitador.puede("ana", 10000), false);
  assert.equal(limitador.puede("beto", 10000), true);
  assert.equal(limitador.puede("ana", 15000), true);
});

test("sin GEMINI_API_KEY el asistente queda no configurado y no consulta a nadie", async () => {
  const asistente = crearAsistente({ apiKey: "" });
  assert.equal(asistente.configurado, false);
  await assert.rejects(asistente.responder("hola"), /no está configurado/);
});
