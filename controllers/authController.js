import User from "../models/User.js";
import { NOMBRE_COOKIE } from "../config/session.js";

/**
 * POST /api/auth/login -> verifica credenciales e inicializa la sesión de usuario.
 * 200 con el usuario en sesión; 401 si las credenciales son incorrectas.
 */
async function login(req, res, next) {
  try {
    const { usuario, password } = req.body;

    const user = await User.verificarCredenciales(usuario, password);
    if (!user) {
      return res.status(401).json({ error: "Usuario o contraseña incorrectos" });
    }

    // Guarda los datos del usuario en la sesión de Express
    req.session.user = {
      id: user.id,
      username: user.username,
      name: user.name,
      email: user.email,
      role: user.role
    };

    res.status(200).json({
      message: "Inicio de sesión exitoso",
      user: req.session.user
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/auth/logout -> destruye la sesión y limpia la cookie del navegador.
 */
function logout(req, res, next) {
  if (!req.session) {
    return res.status(200).json({ message: "Sesión cerrada correctamente" });
  }

  req.session.destroy((err) => {
    if (err) {
      return next(err);
    }
    res.clearCookie(NOMBRE_COOKIE);
    res.status(200).json({ message: "Sesión cerrada correctamente" });
  });
}

/**
 * GET /api/auth/me -> devuelve la información del usuario autenticado en la sesión actual.
 */
function me(req, res) {
  if (!req.session || !req.session.user) {
    return res.status(200).json({ authenticated: false, user: null });
  }
  res.status(200).json({ authenticated: true, user: req.session.user });
}

export { login, logout, me };
