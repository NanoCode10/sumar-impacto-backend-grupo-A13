const express = require("express");
const path = require("path");

const organizationsRoutes = require("./routes/organizationsRoutes");
const campaignsRoutes = require("./routes/campaignsRoutes");
const viewsRoutes = require("./routes/viewsRoutes");

const { notFound, errorHandler } = require("./middlewares/errors");

const app = express();
const PORT = 3000;

//Middleware incorporado en Express para parsear el cuerpo de las solicitudes entrantes en formato JSON
app.use(express.json());

// Configuración del motor de plantillas Pug
app.set("view engine", "pug");
app.set("views", path.join(__dirname, "views"));

// Archivos estáticos (JS del navegador que usa fetch contra la API). Middleware incorporado en Express.
app.use(express.static(path.join(__dirname, "public")));

// API REST: responde siempre JSON
app.use("/api/organizations", organizationsRoutes);
app.use("/api/campaigns", campaignsRoutes);

// Páginas HTML con Pug: inicio y fichas de detalle
app.use("/", viewsRoutes);

// Manejo de errores: van al final, cuando ninguna ruta atendió la petición
app.use(notFound);
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Servidor escuchando en http://localhost:${PORT}`);
});
