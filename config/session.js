import session from "express-session";
import MongoStore from "connect-mongo";
import mongoose from "mongoose";

/**
 * SESIÓN DE USUARIO (express-session + connect-mongo)
 *
 * Al iniciar sesión, el servidor guarda quién es el usuario y le da al navegador
 * una cookie con un identificador firmado. Las sesiones se guardan en MongoDB
 * (colección "sessions"), no en memoria: sobreviven a los reinicios del servidor
 * (nodemon en desarrollo, cada despliegue en Render) y MongoDB borra solo las vencidas.
 */

export const NOMBRE_COOKIE = "sumarimpacto.sid";

// 8 horas desde el inicio de sesión: una jornada de trabajo. Después hay que volver a entrar.
const DURACION_MS = 8 * 60 * 60 * 1000;

export function crearSesion() {
  const secreto = process.env.SESSION_SECRET;
  // Sin valor de respaldo: si falta, la app no arranca (mejor un error visible que
  // cookies firmadas con un secreto conocido).
  if (!secreto) {
    throw new Error("Falta la variable de entorno SESSION_SECRET. Ver .env.example.");
  }

  return session({
    name: NOMBRE_COOKIE,
    secret: secreto,
    resave: false, // no reescribe la sesión si no cambió
    saveUninitialized: false, // no crea sesiones para quien no inició sesión
    store: MongoStore.create({
      // Reusa la conexión de Mongoose (config/db.js) en lugar de abrir otra.
      clientPromise: mongoose.connection.asPromise().then((conexion) => conexion.getClient()),
      ttl: DURACION_MS / 1000 // en segundos; MongoDB borra las vencidas con un índice TTL
    }),
    cookie: {
      httpOnly: true, // el JavaScript de la página no puede leerla
      sameSite: "lax", // no viaja en pedidos que otro sitio dispara por detrás
      // Sólo por HTTPS en producción. En local (http://localhost) no se activa.
      secure: process.env.NODE_ENV === "production",
      maxAge: DURACION_MS
    }
  });
}
