require("dotenv").config();

const express = require("express");
const path = require("path");

const connectDB = require("./config/db");
const errorHandler = require("./middlewares/errorHandler");

const organizationsRoutes = require("./routes/organizationsRoutes");
const campaignsRoutes = require("./routes/campaignsRoutes");

const Organization = require("./models/Organization");
const Campaign = require("./models/Campaign");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware para parsear JSON
app.use(express.json());

// Configuración del motor de plantillas Pug
app.set("view engine", "pug");
app.set("views", path.join(__dirname, "views"));

// Ruta de inicio
app.get("/", async (req, res, next) => {
  try {
    const organizations = await Organization.find();
    const campaigns = await Campaign.find();
    res.render("home", { title: "SumarImpacto", organizations, campaigns });
  } catch (err) {
    next(err);
  }
});

// Rutas principales
app.use("/organizations", organizationsRoutes);
app.use("/campaigns", campaignsRoutes);

// Middleware para rutas no encontradas (404)
app.use((req, res) => {
  res.status(404).json({ error: "Ruta no encontrada" });
});

// Middleware centralizado de manejo de errores (debe ir siempre al final de todas las rutas)
app.use(errorHandler);

/**
 * startServer: Función asincrónica que primero conecta a MongoDB y luego levanta el servidor.
 * Si la conexión falla, muestra el error y termina el proceso con código 1.
 */
async function startServer() {
  try {
    await connectDB();
    app.listen(PORT, () => {
      console.log(`Servidor escuchando en http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error("Error al conectar con MongoDB:", err.message);
    process.exit(1);
  }
}

startServer();
