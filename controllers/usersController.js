import User from "../models/User.js";

/**
 * POST /api/users  -> crea un usuario.
 * validateUser ya controló campos, tipos, formato y largo de la contraseña.
 * User.crear la hashea y lanza 409 si el username o el email ya existen.
 * La respuesta nunca incluye la contraseña ni su hash (toJSON del modelo).
 */
async function createUser(req, res, next) {
  try {
    const { username, name, email, password, role } = req.body;

    const newUser = await User.crear({ username, name, email, password, role });
    res.status(201).json(newUser);
  } catch (err) {
    next(err);
  }
}

export { createUser };
