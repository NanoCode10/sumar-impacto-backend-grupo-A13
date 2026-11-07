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
      const respuesta = await ai.models.generateContent({
        model: modelo,
        contents: pregunta,
        config: { systemInstruction: instruccion }
      });
      return respuesta.text?.trim() || "No tengo una respuesta para eso.";
    }
  };
}
