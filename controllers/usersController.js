import User from "../models/User.js";

/**
 * CONTROLLER DE USUARIOS
 * Todas las rutas son sólo para superadmin (ver routes/usersRoutes.js). Las
 * respuestas nunca incluyen la contraseña ni su hash (toJSON del modelo).
 * Las reglas (409) las aplica el modelo; acá se le pasa quién hace el cambio
 * (el usuario de la sesión), para que nadie se elimine o se degrade a sí mismo.
 */

/**
 * GET /api/users  -> listado, con filtro opcional por rol (?role=).
 */
async function getUsers(req, res, next) {
  try {
    res.status(200).json(await User.buscarTodos(req.filtros));
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/users/:id  -> un usuario.
 */
async function getUserById(req, res, next) {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }
    res.status(200).json(user);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/users  -> crea un usuario.
 * validateUser ya controló campos, tipos, formato y largo de la contraseña.
 * User.crear la hashea y lanza 409 si el username o el email ya existen.
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

/**
 * PUT /api/users/:id  -> actualiza nombre, email, rol y, si viene, la contraseña.
 */
async function updateUser(req, res, next) {
  try {
    const { name, email, role, password } = req.body;

    const user = await User.actualizar(req.params.id, { name, email, role, password }, req.session.user.id);
    if (!user) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }
    res.status(200).json(user);
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/users/:id  -> elimina un usuario (borrado lógico).
 */
async function deleteUser(req, res, next) {
  try {
    const user = await User.eliminar(req.params.id, req.session.user.id);
    if (!user) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }
    res.status(200).json({ message: "Usuario eliminado correctamente", user });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /users  -> página de gestión de usuarios. La tabla la completa el
 * navegador con fetch() (public/js/users.js); acá sólo se pasan los roles.
 */
function renderUsers(req, res) {
  res.render("users", { title: "Usuarios - SumarImpacto", roles: User.ROLES });
}

export { getUsers, getUserById, createUser, updateUser, deleteUser, renderUsers };
