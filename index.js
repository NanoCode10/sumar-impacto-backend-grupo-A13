require("dotenv").config();

const express = require("express");
const path = require("path");

const connectDB = require("./config/db");

const organizationsRoutes = require("./routes/organizationsRoutes");
const campaignsRoutes = require("./routes/campaignsRoutes");

const Organization = require("./models/Organization");
const Campaign = require("./models/Campaign");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware incorporado en Express para parsear el cuerpo de las solicitudes entrantes en formato JSON
app.use(express.json());

// Configuración del motor de plantillas Pug
app.set("view engine", "pug");
app.set("views", path.join(__dirname, "views"));

// Ruta de inicio
app.get("/", (req, res) => {
  const organizations = Organization.findAll();
  const campaigns = Campaign.findAll();
  res.render("home", { title: "SumarImpacto", organizations, campaigns });
});

// Rutas principales
app.use("/organizations", organizationsRoutes);
app.use("/campaigns", campaignsRoutes);

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
