/**
 * MIDDLEWARES DE AUTENTICACIÓN Y AUTORIZACIÓN (RBAC)
 * Manejan el control de acceso en la API y en las vistas mediante express-session.
 */

/**
 * isAuthenticated: Verifica que exista una sesión activa con un usuario autenticado.
 * Responde 401 si no hay sesión.
 */
export function isAuthenticated(req, res, next) {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ error: "Debe iniciar sesión para realizar esta acción" });
  }
  next();
}

/**
 * hasRole: Control de acceso basado en roles (RBAC).
 * Exige que el usuario esté autenticado y que su rol coincida con alguno de los roles permitidos.
 * Responde 401 si no está autenticado y 403 si el rol no tiene permisos suficientes.
 *
 * @param  {...string} rolesPermitidos - Lista de roles autorizados (ej: "superadmin", "administrador")
 */
export function hasRole(...rolesPermitidos) {
  // Soporta tanto array como argumentos separados: hasRole("a", "b") o hasRole(["a", "b"])
  const permitidos = rolesPermitidos.flat();

  return (req, res, next) => {
    if (!req.session || !req.session.user) {
      return res.status(401).json({ error: "Debe iniciar sesión para realizar esta acción" });
    }

    const { role } = req.session.user;
    if (!permitidos.includes(role)) {
      return res.status(403).json({
        error: `Acceso denegado: su rol (${role}) no tiene permisos para esta operación. Roles requeridos: ${permitidos.join(", ")}`
      });
    }

    next();
  };
}

/**
 * requireAuthView: Protección para páginas HTML (Pug).
 * Si el usuario no inició sesión, lo redirige a /login.
 */
export function requireAuthView(req, res, next) {
  if (!req.session || !req.session.user) {
    return res.redirect("/login");
  }
  next();
}

