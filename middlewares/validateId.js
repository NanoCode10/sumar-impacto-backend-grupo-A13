function validateId(req, res, next) {

  // Extrae el id de los parámetros de la solicitud
  const { id } = req.params;

  // console.log("validateId recibió:", id); para pruebas de funcionamiento por consola

  // Verifica si el id es un número entero positivo utilizando una expresión regular 
  // Si no lo es, delega el error al errorHandler global (middlewares/errors.js):
  // se usa en la API y en las vistas, y es él quien decide si responder JSON o HTML.
  if (!/^[1-9]\d*$/.test(id)) {
    const err = new Error("El id debe ser un número entero positivo");
    err.statusCode = 400;
    return next(err);
  }
  // Si el id es válido, llama a next() para pasar al siguiente middleware o controlador
  next();
}

module.exports = validateId;
