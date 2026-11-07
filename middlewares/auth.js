/**
 * MIDDLEWARES DE AUTENTICACIÓN Y AUTORIZACIÓN (RBAC)
 * Manejan el control de acceso en la API y en las vistas mediante express-session.
 */

/**
 * Lo único de la API que se puede usar sin sesión. Todo lo demás la exige
 * (denegar por defecto): una ruta nueva nace protegida aunque alguien se olvide
 * de ponerle un control. Las rutas son relativas a /api.
 */
const RUTAS_PUBLICAS = [
  { metodo: "GET", ruta: "/organizations" },
  { metodo: "GET", ruta: "/campaigns" },
  { metodo: "POST", ruta: "/auth/login" },
  { metodo: "POST", ruta: "/auth/logout" },
  { metodo: "GET", ruta: "/auth/me" }
];

export function esRutaPublica(metodo, ruta) {
  return RUTAS_PUBLICAS.some(
    (p) => p.metodo === metodo && (ruta === p.ruta || ruta.startsWith(`${p.ruta}/`))
  );
}

/**
 * requireLoginSalvoPublicas: se monta una sola vez delante de toda la API.
 * Sin sesión, responde 401 salvo en las rutas públicas. Los permisos por rol
 * siguen en cada archivo de rutas (hasRole).
 */
export function requireLoginSalvoPublicas(req, res, next) {
  if (req.session?.user || esRutaPublica(req.method, req.path)) {
    return next();
  }
  return res.status(401).json({ error: "Debe iniciar sesión para realizar esta acción" });
}

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

