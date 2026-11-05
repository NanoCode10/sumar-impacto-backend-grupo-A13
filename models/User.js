import crypto from "node:crypto";
import mongoose from "mongoose";

import Organization from "./Organization.js";
import softDelete from "../utils/softDelete.js";

/**
 * MODELO User (Mongoose)
 * La contraseña nunca se guarda: se guarda su hash (passwordHash) y la sal con
 * que se calculó (salt), con el módulo crypto de Node, como en el ejemplo de la
 * cátedra. toJSON quita los dos de toda respuesta.
 *
 * Se puede entrar con el nombre de usuario o con el email: el username no admite
 * "@", así que un valor con "@" siempre es un email.
 *
 * MÉTODOS PROPIOS
 *   crearPasswordSeguro(password): sal aleatoria + hash (estático).
 *   validarPassword(password): compara una contraseña con la guardada (de instancia).
 *   buscarTodos(filtros): listado, con filtro opcional por rol.
 *   crear(datos): crea el usuario con la contraseña hasheada (409 si el username o
 *                 el email ya existen).
 *   actualizar(id, datos): nombre, email, rol y contraseña (username no).
 *   eliminar(id): borrado lógico.
 *   verificarCredenciales(usuario, password): el usuario si coinciden; null si no.
 *
 * Regla: no se elimina ni se degrada al último superadmin (409), para que el
 * sistema no quede sin quien gestione usuarios.
 */

// superadmin: todo, incluida la gestión de usuarios y roles.
// administrador: organizaciones y campañas. auditoria: revisa, no gestiona.
// organizacion: referente de una organización social.
const ROLES = ["superadmin", "administrador", "auditoria", "organizacion"];

// Letras, números, punto, guion y guion bajo; sin "@" para no confundirse con un email.
const USERNAME = /^[a-z0-9._-]{3,30}$/;

// Parámetros del hash (PBKDF2), los del ejemplo de la cátedra: 10000 iteraciones,
// 64 bytes de resultado y SHA-512. Más iteraciones es más lento para el servidor
// y para quien intente adivinar contraseñas.
const ITERACIONES = 10000;
const LARGO_HASH = 64;
const ALGORITMO = "sha512";

const calcularHash = (password, salt) =>
  crypto.pbkdf2Sync(password, salt, ITERACIONES, LARGO_HASH, ALGORITMO).toString("hex");

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, "username es obligatorio"],
      trim: true,
      lowercase: true,
      unique: true,
      match: [USERNAME, "username debe tener de 3 a 30 caracteres: letras, números, punto, guion o guion bajo"]
    },
    name: {
      type: String,
      required: [true, "name es obligatorio"],
      trim: true,
      minlength: [3, "name debe ser un texto de 3 a 100 caracteres"],
      maxlength: [100, "name debe ser un texto de 3 a 100 caracteres"]
    },
    email: {
      type: String,
      required: [true, "email es obligatorio"],
      trim: true,
      lowercase: true,
      unique: true,
      match: [Organization.EMAIL, "email no tiene un formato válido"]
    },
    passwordHash: {
      type: String,
      required: true
    },
    salt: {
      type: String,
      required: true
    },
    role: {
      type: String,
      enum: { values: ROLES, message: `role inválido. Valores permitidos: ${ROLES.join(", ")}` },
      // Mínimo privilegio: si no se indica, el rol con menos permisos.
      default: "organizacion"
    }
  },
  {
    timestamps: true,
    toJSON: {
      versionKey: false,
      transform: (doc, ret) => {
        const { _id, passwordHash, salt, ...resto } = ret;
        return { id: _id.toString(), ...resto };
      }
    }
  }
);

// Borrado lógico. El username y el email de un usuario eliminado siguen
// reservados (índice único): no se reasigna la identidad de alguien eliminado.
userSchema.plugin(softDelete);

/**
 * Genera una sal aleatoria de 16 bytes y el hash de la contraseña con esa sal.
 * Cada usuario tiene su propia sal: dos contraseñas iguales dan hashes distintos.
 */
userSchema.statics.crearPasswordSeguro = function (password) {
  const salt = crypto.randomBytes(16).toString("hex");
  return { salt, passwordHash: calcularHash(password, salt) };
};

/**
 * Recalcula el hash de la contraseña ingresada con la sal guardada y lo compara
 * con el hash guardado. timingSafeEqual tarda lo mismo coincida o no, así que el
 * tiempo de respuesta no da pistas sobre cuántos caracteres coincidieron.
 */
userSchema.methods.validarPassword = function (password) {
  const ingresado = Buffer.from(calcularHash(password, this.salt), "hex");
  const guardado = Buffer.from(this.passwordHash, "hex");
  return ingresado.length === guardado.length && crypto.timingSafeEqual(ingresado, guardado);
};

function conflicto(mensaje) {
  const err = new Error(mensaje);
  err.statusCode = 409;
  return err;
}

// exists() no ve a los usuarios eliminados (borrado lógico), pero el índice único
// sí: su username y su email siguen reservados. La base lo rechaza con el código
// 11000 (clave duplicada), que se convierte en el mismo 409.
function conflictoPorDuplicado(err) {
  if (err.code !== 11000) {
    return err;
  }
  const campo = Object.keys(err.keyPattern ?? {})[0] ?? "username o email";
  return conflicto(`Ya existe un usuario con ese ${campo} (eliminado): no puede reutilizarse`);
}

/**
 * Usuarios ordenados por fecha de alta. Sin filtros, todos.
 * @param {{role?: string}} filtros
 */
userSchema.statics.buscarTodos = function (filtros = {}) {
  return this.find(filtros).sort({ _id: 1 });
};

/**
 * Crea un usuario con la contraseña hasheada.
 * Regla: username y email únicos (409). Se comprueba antes de guardar para dar
 * un mensaje claro; el índice único de la base es la garantía final.
 */
userSchema.statics.crear = async function ({ username, name, email, password, role }) {
  const usernameNormal = username.trim().toLowerCase();
  const emailNormal = email.trim().toLowerCase();

  for (const [campo, valor] of [["username", usernameNormal], ["email", emailNormal]]) {
    if (await this.exists({ [campo]: valor })) {
      throw conflicto(`Ya existe un usuario con ese ${campo}: ${valor}`);
    }
  }

  const { salt, passwordHash } = this.crearPasswordSeguro(password);
  try {
    return await this.create({ username: usernameNormal, name, email: emailNormal, passwordHash, salt, role });
  } catch (err) {
    throw conflictoPorDuplicado(err);
  }
};

// Quitarle a alguien el rol de superadmin (por baja o por cambio de rol) no puede
// dejar al sistema sin superadmin.
async function comprobarNoEsUltimoSuperadmin(Modelo, mensaje) {
  if ((await Modelo.countDocuments({ role: "superadmin" })) <= 1) {
    throw conflicto(mensaje);
  }
}

/**
 * Actualiza sólo los campos enviados (name, email, role, password). El username
 * no se modifica: es la identidad del usuario. Devuelve el usuario actualizado,
 * o null si no existe.
 */
userSchema.statics.actualizar = async function (id, { name, email, role, password }) {
  const user = await this.findById(id);
  if (!user) {
    return null;
  }

  if (role !== undefined && user.role === "superadmin" && role !== "superadmin") {
    await comprobarNoEsUltimoSuperadmin(this, "No se le puede quitar el rol al último superadmin");
  }

  if (email !== undefined) {
    const emailNormal = email.trim().toLowerCase();
    if (emailNormal !== user.email && (await this.exists({ email: emailNormal }))) {
      throw conflicto(`Ya existe un usuario con ese email: ${emailNormal}`);
    }
    user.email = emailNormal;
  }
  if (name !== undefined) user.name = name;
  if (role !== undefined) user.role = role;
  if (password !== undefined) Object.assign(user, this.crearPasswordSeguro(password));

  try {
    return await user.save();
  } catch (err) {
    throw conflictoPorDuplicado(err);
  }
};

/**
 * Elimina un usuario (borrado lógico). Devuelve el usuario eliminado, o null si
 * no existe.
 */
userSchema.statics.eliminar = async function (id) {
  const user = await this.findById(id);
  if (!user) {
    return null;
  }

  if (user.role === "superadmin") {
    await comprobarNoEsUltimoSuperadmin(this, "No se puede eliminar al último superadmin");
  }

  user.deletedAt = new Date();
  await user.save();
  return user;
};

/**
 * Comprueba usuario (username o email) y contraseña. Devuelve el usuario si
 * coinciden y null si no, sin distinguir cuál de los dos falló.
 */
userSchema.statics.verificarCredenciales = async function (usuario, password) {
  const valor = usuario.trim().toLowerCase();
  // Con "@" es un email; sin "@", un nombre de usuario (que no admite "@").
  const filtro = valor.includes("@") ? { email: valor } : { username: valor };

  const user = await this.findOne(filtro);
  if (!user) {
    return null;
  }
  return user.validarPassword(password) ? user : null;
};

const User = mongoose.model("User", userSchema);

User.ROLES = ROLES;
User.USERNAME = USERNAME;

export default User;
