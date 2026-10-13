/**
 * PROTECCIÓN DE RUTAS CON LA SESIÓN (ver config/session.js y authController)
 *  - requireLogin: hace falta haber entrado. Sin sesión: 401 en la API y
 *    redirección a /login en las páginas.
 *  - requireRole(...roles): además, el rol tiene que estar entre los indicados.
 *    Con sesión pero sin el rol: 403.
 *
 * Los errores se delegan al errorHandler (middlewares/errors.js), que responde
 * JSON en la API y la página error.pug en las vistas, como el resto de la app.
 */

const esApi = (req) => req.originalUrl.startsWith("/api");

function errorConCodigo(mensaje, statusCode) {
  const err = new Error(mensaje);
  err.statusCode = statusCode;
  return err;
}

function requireLogin(req, res, next) {
  if (req.session?.user) {
    return next();
  }
  if (esApi(req)) {
    return next(errorConCodigo("Hay que iniciar sesión", 401));
  }
  // Página: al login, recordando a dónde quería ir.
  res.redirect(`/login?volver=${encodeURIComponent(req.originalUrl)}`);
}

function requireRole(...roles) {
  return (req, res, next) => {
    requireLogin(req, res, (err) => {
      if (err) {
        return next(err);
      }
      if (!roles.includes(req.session.user.role)) {
        return next(errorConCodigo(`Esta operación requiere el rol: ${roles.join(" o ")}`, 403));
      }
      next();
    });
  };
}

// Roles que pueden usar las pantallas de gestión y las altas, ediciones y bajas.
const ROLES_GESTION = ["superadmin", "administrador"];

/**
 * Deja el usuario de la sesión a disposición de todas las vistas Pug
 * (res.locals), para que el menú muestre quién está conectado y qué puede usar.
 * No protege nada: sólo informa.
 */
function exponerUsuario(req, res, next) {
  const usuario = req.session?.user ?? null;
  res.locals.usuario = usuario;
  res.locals.puedeGestionar = Boolean(usuario && ROLES_GESTION.includes(usuario.role));
  next();
}

export { requireLogin, requireRole, exponerUsuario, ROLES_GESTION };
