import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * PREPARA EL .env PARA CORRER EN LOCAL
 * Uso: npm run setup
 *
 * - Si no hay .env, lo crea copiando .env.example.
 * - Si SESSION_SECRET está vacío o falta, le pone uno al azar.
 * - No pisa nada que ya esté completo, y nunca muestra el secreto en pantalla.
 */

const raiz = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const archivoEnv = path.join(raiz, ".env");
const archivoEjemplo = path.join(raiz, ".env.example");

let contenido;
if (existsSync(archivoEnv)) {
  contenido = readFileSync(archivoEnv, "utf8");
  console.log(".env ya existe: no se reemplaza.");
} else {
  contenido = readFileSync(archivoEjemplo, "utf8");
  console.log(".env creado a partir de .env.example (MongoDB local).");
}

const secreto = randomBytes(32).toString("hex");
const lineaVacia = /^SESSION_SECRET=\s*$/m;

if (lineaVacia.test(contenido)) {
  contenido = contenido.replace(lineaVacia, `SESSION_SECRET=${secreto}`);
  console.log("SESSION_SECRET generado al azar.");
} else if (!/^SESSION_SECRET=/m.test(contenido)) {
  contenido = `${contenido.trimEnd()}\nSESSION_SECRET=${secreto}\n`;
  console.log("SESSION_SECRET agregado al final, generado al azar.");
} else {
  console.log("SESSION_SECRET ya tenía valor: no se cambia.");
}

writeFileSync(archivoEnv, contenido);
console.log("Listo. Siguiente paso: npm run seed -- --confirm-db=sumarimpacto");
