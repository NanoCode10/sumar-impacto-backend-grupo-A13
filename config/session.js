import session from "express-session";
import MongoStore from "connect-mongo";

/**
 * SESIÓN DE USUARIO (express-session + connect-mongo)
 * Al hacer login, el servidor guarda en la sesión quién es el usuario y le da al
 * navegador una cookie con un identificador al azar. El navegador la manda sola en
 * cada pedido, y así el servidor sabe quién lo hace (ver middlewares/auth.js).
 *
 * Las sesiones se guardan en MongoDB, en la colección "sessions": sobreviven a los
 * reinicios del servidor (con nodemon, cada vez que se guarda un archivo).
 */

// 8 horas: una jornada de trabajo. Después hay que volver a entrar.
const DURACION_MS = 8 * 60 * 60 * 1000;

export function crearSesion() {
  const secreto = process.env.SESSION_SECRET;
  if (!secreto) {
    throw new Error("Falta la variable de entorno SESSION_SECRET. Copiá .env.example como .env.");
  }

  return session({
    name: "sumarimpacto.sid",
    secret: secreto, // firma la cookie: si alguien la altera, se descarta
    resave: false, // no reescribe la sesión si no cambió
    saveUninitialized: false, // no crea sesiones para visitantes que no entraron
    store: MongoStore.create({
      mongoUrl: process.env.MONGO_URI,
      ttl: DURACION_MS / 1000 // MongoDB borra solo las sesiones vencidas
    }),
    cookie: {
      httpOnly: true, // el JavaScript de la página no puede leerla
      sameSite: "lax", // no viaja en pedidos que se originan en otros sitios
      secure: process.env.NODE_ENV === "production", // sólo por HTTPS en producción
      maxAge: DURACION_MS
    }
  });
}
