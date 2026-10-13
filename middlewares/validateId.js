import esObjectId from "../utils/objectId.js";

function validateId(req, res, next) {

  // Extrae el id de los parámetros de la solicitud
  const { id } = req.params;

  // Verifica que el id sea un ObjectId de MongoDB (24 caracteres hexadecimales).
  // Si no lo es, delega el error al errorHandler global (middlewares/errors.js):
  // se usa en la API y en las vistas, y es él quien decide si responder JSON o HTML.
  if (!esObjectId(id)) {
    const err = new Error("El id debe ser un ObjectId válido (24 caracteres hexadecimales)");
    err.statusCode = 400;
    return next(err);
  }
  // Si el id es válido, llama a next() para pasar al siguiente middleware o controlador
  next();
}

export default validateId;
