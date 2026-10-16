import User from "../models/User.js";

/**
 * POST /api/auth/login  -> verifica usuario (username o email) y contraseña.
 * 200 con el usuario (sin contraseña ni hash) si coinciden; 401 si no.
 * El mensaje de error es el mismo para usuario inexistente y contraseña
 * incorrecta, para no revelar qué usuarios existen.
 *
 * No crea sesión ni token: la API no recuerda al usuario entre pedidos. La
 * sesión queda para la entrega 3.
 */
async function login(req, res, next) {
  try {
    const { usuario, password } = req.body;

    const user = await User.verificarCredenciales(usuario, password);
    if (!user) {
      return res.status(401).json({ error: "Usuario o contraseña incorrectos" });
    }

    res.status(200).json(user);
  } catch (err) {
    next(err);
  }
}

export { login };
