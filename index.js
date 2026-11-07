import express from "express";
import dotenv from "dotenv";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Server } from "socket.io";

import { conectarDB } from "./config/db.js";
import { crearSesion } from "./config/session.js";
import { revalidarUsuarioDeSesion } from "./middlewares/auth.js";
import { registrarChat } from "./sockets/chat.js";
import { crearAsistente } from "./services/asistente.js";

import apiRoutes from "./routes/apiRoutes.js";
import viewsRoutes from "./routes/viewsRoutes.js";

import { notFound, errorHandler } from "./middlewares/errors.js";

// En ES Modules no existe __dirname: se obtiene a partir de la URL de este archivo.
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Carga las variables de .env en process.env (MONGO_URI, PORT). quiet evita el
// mensaje informativo que dotenv imprime en cada arranque.
dotenv.config({ quiet: true });

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware incorporado en Express para parsear el cuerpo de las solicitudes entrantes en formato JSON
app.use(express.json());

// En producción (Render) el HTTPS lo atiende un proxy que le pasa el pedido a la app por
// HTTP interno. Sin esto, Express cree que la conexión no es segura y no envía la cookie
// de sesión marcada "secure": el login respondería bien pero no quedaría la sesión.
if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

// Sesiones de usuario guardadas en MongoDB (ver config/session.js). El mismo middleware
// lo usa el chat, así la conexión de Socket.IO sabe quién es el usuario.
let sesion;
try {
  sesion = crearSesion();
} catch (err) {
  console.error(err.message);
  process.exit(1);
}
app.use(sesion);

// En cada pedido con sesión, vuelve a leer el usuario: una baja o un cambio de rol rigen al instante
app.use(revalidarUsuarioDeSesion);

// Pasa el usuario activo a res.locals para que las vistas Pug adapten su navegación
app.use((req, res, next) => {
  res.locals.user = req.session?.user || null;
  next();
});

// Configuración del motor de plantillas Pug
app.set("view engine", "pug");
app.set("views", path.join(__dirname, "views"));

// Versión de los scripts del navegador (las vistas piden /js/x.js?v=...). Cambia en cada
// despliegue, así el navegador baja el archivo nuevo en lugar de usar el que tenía guardado.
// En Render es el commit publicado (RENDER_GIT_COMMIT); en local, la hora de arranque.
app.locals.versionEstaticos = (process.env.RENDER_GIT_COMMIT || Date.now().toString(36)).slice(0, 12);

// Archivos estáticos (JS del navegador que usa fetch contra la API). Middleware incorporado en Express.
app.use(express.static(path.join(__dirname, "public")));

// API REST: responde siempre JSON. Exige sesión salvo en las rutas públicas (ver routes/apiRoutes.js)
app.use("/api", apiRoutes);

// Páginas HTML con Pug: inicio y fichas de detalle
app.use("/", viewsRoutes);

// Manejo de errores: van al final, cuando ninguna ruta atendió la petición
app.use(notFound);
app.use(errorHandler);

// Primero se conecta a MongoDB y recién después el servidor acepta peticiones.
// Si la conexión falla no tiene sentido levantarlo: se muestra el motivo y se termina.
try {
  await conectarDB();
} catch (err) {
  console.error(err.message);
  process.exit(1);
}

// Un solo servidor HTTP atiende las dos cosas: las peticiones comunes van a Express y las
// del chat a Socket.IO. Por eso escucha el servidor HTTP y no la app de Express.
const servidor = http.createServer(app);
const io = new Server(servidor);
io.engine.use(sesion);
registrarChat(io, { asistente: crearAsistente() });

servidor.listen(PORT, () => {
  console.log(`Servidor escuchando en http://localhost:${PORT}`);
});
