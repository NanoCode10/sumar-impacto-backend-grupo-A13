const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "1.1.1.1"]);
/**
 * connectDB: Establece la conexión con MongoDB usando Mongoose.
 * La URI de conexión se lee desde la variable de entorno MONGODB_URI,
 * definida en el archivo .env 
 *
 * @returns {Promise<void>}
 * @throws {Error}
 */
async function connectDB() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error(
      "La variable de entorno MONGODB_URI no está definida. " +
      "Asegurate de crear un archivo .env con MONGODB_URI=<tu_uri>."
    );
  }

  await mongoose.connect(uri);
  console.log("Conexión a MongoDB establecida correctamente.");
}

module.exports = connectDB;
