import express from "express";
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { conectarDB } from "./config/db.js";
import { crearSesion } from "./config/session.js";

import organizationsRoutes from "./routes/organizationsRoutes.js";
import campaignsRoutes from "./routes/campaignsRoutes.js";
import usersRoutes from "./routes/usersRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import viewsRoutes from "./routes/viewsRoutes.js";

import { notFound, errorHandler } from "./middlewares/errors.js";
import { exponerUsuario } from "./middlewares/auth.js";

// En ES Modules no existe __dirname: se obtiene a partir de la URL de este archivo.
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Carga las variables de .env en process.env (MONGO_URI, PORT, SESSION_SECRET). quiet evita el
// mensaje informativo que dotenv imprime en cada arranque.
dotenv.config({ quiet: true });

const app = express();
const PORT = process.env.PORT || 3000;

//Middleware incorporado en Express para parsear el cuerpo de las solicitudes entrantes en formato JSON
app.use(express.json());

// Configuración del motor de plantillas Pug
app.set("view engine", "pug");
app.set("views", path.join(__dirname, "views"));

// Archivos estáticos (JS del navegador que usa fetch contra la API). Middleware incorporado en Express.
app.use(express.static(path.join(__dirname, "public")));

// Sesión de usuario: después de los estáticos (no la necesitan) y antes de las
// rutas, que la usan para saber quién pide.
app.use(crearSesion());
app.use(exponerUsuario);

// API REST: responde siempre JSON
app.use("/api/organizations", organizationsRoutes);
app.use("/api/campaigns", campaignsRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/auth", authRoutes);

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

app.listen(PORT, () => {
  console.log(`Servidor escuchando en http://localhost:${PORT}`);
});
