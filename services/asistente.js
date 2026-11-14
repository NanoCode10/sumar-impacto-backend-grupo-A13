import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { GoogleGenAI } from "@google/genai";

/**
 * ASISTENTE DEL CHAT (Gemini, SDK @google/genai)
 *
 * Responde las consultas del chat que empiezan con @gemini. La clave y el modelo salen
 * del .env (GEMINI_API_KEY, GEMINI_MODEL): la clave nunca está en el código ni llega al
 * navegador. Sin clave, el asistente queda "no configurado" y el chat funciona igual.
 *
 * Cómo se comporta lo define una instrucción de sistema en config/asistente.txt: se cambia
 * el texto sin tocar el código. A Gemini sólo se le manda la pregunta, nunca datos de la base.
 */

const MODELO_POR_DEFECTO = "gemini-3.5-flash-lite";

const archivoInstruccion = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "config", "asistente.txt");

export function crearAsistente({
  apiKey = process.env.GEMINI_API_KEY,
  modelo = process.env.GEMINI_MODEL || MODELO_POR_DEFECTO
} = {}) {
  if (!apiKey) {
    return {
      configurado: false,
      async responder() {
        throw new Error("El asistente no está configurado (falta GEMINI_API_KEY)");
      }
    };
  }

  // El cliente se crea una sola vez; cada consulta es una petición HTTPS a la API.
  const ai = new GoogleGenAI({ apiKey });
  const instruccion = readFileSync(archivoInstruccion, "utf8");

  return {
    configurado: true,
    async responder(pregunta) {
      const consulta = ai.models.generateContent({
        model: modelo,
        contents: pregunta,
        // Tope de largo de la respuesta: unas cinco oraciones (también acota el consumo).
        config: { systemInstruction: instruccion, maxOutputTokens: MAXIMO_TOKENS_RESPUESTA }
      });
      const respuesta = await conTiempoMaximo(consulta, TIEMPO_MAXIMO_MS);
      return respuesta.text?.trim() || "No tengo una respuesta para eso.";
    }
  };
}

const MAXIMO_TOKENS_RESPUESTA = 400;
const TIEMPO_MAXIMO_MS = 20000;

// Si Google tarda más que el máximo, se deja de esperar y se informa: el chat no queda
// con «escribiendo…» indefinidamente.
export function conTiempoMaximo(promesa, ms) {
  let temporizador;
  const vencimiento = new Promise((_, rechazar) => {
    temporizador = setTimeout(() => rechazar(new Error(`El asistente no respondió en ${ms / 1000} segundos`)), ms);
  });
  return Promise.race([promesa, vencimiento]).finally(() => clearTimeout(temporizador));
}
