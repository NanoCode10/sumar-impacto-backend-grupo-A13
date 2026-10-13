/**
 * MANEJO DE ERRORES
 * Los dos middlewares de acá van AL FINAL de index.js, después de las rutas:
 * sólo llegan las peticiones que ninguna ruta atendió, o las que fallaron.
 *
 *  - notFound     -> ninguna ruta coincidió (404).
 *  - errorHandler -> algo falló. Express lo reconoce como manejador de errores
 *                    porque declara CUATRO parámetros (err, req, res, next);
 *                    con tres lo trataría como un middleware común.
 *
 * El formato de la respuesta depende del área: la API responde JSON y las
 * páginas responden HTML con la vista error.pug. Es la misma separación que
 * index.js hace entre /api y las vistas.
 */

const quiereJson = (req) => req.originalUrl.startsWith("/api");

function notFound(req, res) {
  const mensaje = `No existe la ruta ${req.method} ${req.originalUrl}`;

  if (quiereJson(req)) {
    return res.status(404).json({ error: mensaje });
  }
  res.status(404).render("error", { title: "No encontrado", codigo: 404, mensaje });
}

function errorHandler(err, req, res, next) {
  // Si la respuesta ya empezó a enviarse no se puede cambiar el código de estado:
  // se delega en el manejador por defecto de Express, que corta la conexión.
  if (res.headersSent) {
    return next(err);
  }

  // express.json() marca así un cuerpo que no es JSON válido.
  const jsonInvalido = err.type === "entity.parse.failed";

  // Errores de Mongoose: el schema rechazó un dato (segunda capa de validación,
  // después de validateBody) o un valor no pudo convertirse al tipo del campo.
  // Normalmente no llegan acá porque los middlewares de validación los frenan antes.
  const validacionMongoose = err.name === "ValidationError";
  const conversionMongoose = err.name === "CastError";

  const codigo =
    jsonInvalido || validacionMongoose || conversionMongoose ? 400 : err.statusCode || err.status || 500;

  // Los errores nuestros (400, 404, 409) llevan un mensaje pensado para el cliente.
  // Los inesperados (500) no: el detalle queda en el log del servidor, porque la
  // traza incluye rutas internas del proyecto.
  let mensaje;
  if (jsonInvalido) {
    mensaje = "El body no es JSON válido";
  } else if (validacionMongoose) {
    mensaje = Object.values(err.errors).map((error) => error.message).join(". ");
  } else if (conversionMongoose) {
    mensaje = `Valor inválido para ${err.path}`;
  } else if (codigo < 500) {
    mensaje = err.message;
  } else {
    mensaje = "Error interno del servidor";
    console.error(err);
  }

  if (quiereJson(req)) {
    return res.status(codigo).json({ error: mensaje });
  }
  res.status(codigo).render("error", { title: "Error", codigo, mensaje });
}

export { notFound, errorHandler };
