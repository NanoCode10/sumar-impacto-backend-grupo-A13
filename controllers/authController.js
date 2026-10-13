import User from "../models/User.js";

/**
 * AUTENTICACIÓN CON SESIÓN (express-session, ver config/session.js)
 * El login guarda en req.session quién es el usuario; el navegador recibe una
 * cookie y la manda sola en cada pedido. middlewares/auth.js la lee para decidir
 * si deja pasar.
 */

// Lo que se guarda en la sesión: lo mínimo para identificar y autorizar.
const datosDeSesion = (user) => ({ id: user.id, username: user.username, role: user.role });

/**
 * POST /api/auth/login  -> verifica usuario (username o email) y contraseña.
 * 200 con el usuario (sin contraseña) y crea la sesión si coinciden; 401 si no.
 * El mensaje de error es el mismo para usuario inexistente y contraseña
 * incorrecta, para no revelar qué usuarios existen.
 */
async function login(req, res, next) {
  try {
    const { usuario, password } = req.body;

    const user = await User.verificarCredenciales(usuario, password);
    if (!user) {
      return res.status(401).json({ error: "Usuario o contraseña incorrectos" });
    }

    // Identificador de sesión nuevo al entrar: si alguien había plantado uno
    // conocido en el navegador (fijación de sesión), deja de servirle.
    req.session.regenerate((err) => {
      if (err) {
        return next(err);
      }
      req.session.user = datosDeSesion(user);
      res.status(200).json(user);
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/auth/logout  -> cierra la sesión y borra la cookie.
 */
function logout(req, res, next) {
  req.session.destroy((err) => {
    if (err) {
      return next(err);
    }
    res.clearCookie("sumarimpacto.sid");
    res.status(200).json({ message: "Sesión cerrada" });
  });
}

/**
 * GET /api/auth/me  -> el usuario de la sesión, o 401 si no hay nadie conectado.
 */
function me(req, res) {
  if (!req.session.user) {
    return res.status(401).json({ error: "No hay una sesión iniciada" });
  }
  res.status(200).json(req.session.user);
}

export { login, logout, me };
