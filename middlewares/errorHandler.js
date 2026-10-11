/**
 * errorHandler: Middleware centralizado de manejo de errores.
 * Express lo reconoce como middleware de errores porque tiene exactamente 4 parámetros: (err, req, res, next).
 *
 * Debe registrarse en index.js DESPUÉS de todas las rutas para que pueda
 * capturar los errores propagados con next(err) desde los controllers.
 *
 * Tipos de error manejados:
 *  - ValidationError (Mongoose): campos obligatorios faltantes o valores no permitidos por el esquema.
 *  - CastError (Mongoose):       id con formato inválido que Mongoose no pudo convertir a ObjectId.
 *  - Error genérico:             cualquier otro error inesperado del servidor (500).
 */
function errorHandler(err, req, res, next) {
  console.error(err);

  // Error de validación de Mongoose: algún campo no cumple las reglas del Schema
  if (err.name === "ValidationError") {
    const messages = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({ error: "Error de validación", details: messages });
  }

  // CastError de Mongoose: el id recibido no pudo convertirse a ObjectId
  if (err.name === "CastError" && err.kind === "ObjectId") {
    return res.status(400).json({ error: "El id proporcionado no es un ObjectId válido de MongoDB" });
  }

  // Error genérico del servidor
  res.status(err.statusCode || 500).json({
    error: err.message || "Error interno del servidor",
  });
}

module.exports = errorHandler;
