const mongoose = require("mongoose");

/**
 * validateId: Middleware que verifica que el parámetro :id de la ruta
 * sea un ObjectId válido de MongoDB (cadena hexadecimal de 24 caracteres).
 *
 * Los IDs en MongoDB no son números enteros sino ObjectIds.
 * Si el id no tiene el formato correcto, Mongoose lanzaría un CastError interno;
 * este middleware lo intercepta antes y devuelve un 400 descriptivo.
 */
function validateId(req, res, next) {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ error: "El id proporcionado no es un ObjectId válido de MongoDB" });
  }

  next();
}

module.exports = validateId;
