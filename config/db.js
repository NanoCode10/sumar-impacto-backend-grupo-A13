import mongoose from "mongoose";

/**
 * CONEXIÓN A MONGODB (servidor local)
 * La cadena de conexión se lee de la variable de entorno MONGO_URI, que dotenv
 * carga desde el archivo .env (ver .env.example). Así cada integrante puede
 * apuntar a su propia base sin tocar el código.
 *
 * conectarDB no termina el proceso: si algo falla lanza un Error con un mensaje
 * claro, e index.js decide qué hacer (no levantar el servidor).
 */

// Tiempo máximo para encontrar el servidor. Sin este límite, si el servicio de
// MongoDB está detenido el arranque queda esperando 30 segundos antes de fallar.
const TIMEOUT_MS = 5000;

export async function conectarDB() {
  const uri = process.env.MONGO_URI;

  if (!uri) {
    throw new Error(
      "Falta la variable de entorno MONGO_URI. Copiá .env.example como .env " +
        "(por defecto apunta a MongoDB local)."
    );
  }

  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: TIMEOUT_MS });
  } catch (err) {
    throw new Error(
      `No se pudo conectar a MongoDB: ${err.message}. ` +
        "¿Está instalado MongoDB y el servicio en ejecución?"
    );
  }

  // Se muestra sólo el nombre de la base, no la cadena de conexión.
  console.log(`MongoDB conectado (base: ${mongoose.connection.name})`);
}
