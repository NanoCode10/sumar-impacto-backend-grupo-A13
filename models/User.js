import mongoose from "mongoose";
import bcrypt from "bcryptjs";

import Organization from "./Organization.js";
import softDelete from "../utils/softDelete.js";

/**
 * MODELO User (Mongoose)
 * La contraseña nunca se guarda: se guarda su hash (bcryptjs) en passwordHash,
 * y toJSON lo quita de toda respuesta.
 *
 * Se puede entrar con el nombre de usuario o con el email: el username no admite
 * "@", así que un valor con "@" siempre es un email.
 *
 * MÉTODOS PROPIOS
 *   crear(datos): hashea la contraseña y crea el usuario (409 si el username o el
 *                 email ya existen).
 *   verificarCredenciales(usuario, password): el usuario si coinciden; null si no.
 */

// superadmin: todo, incluida la gestión de usuarios y roles.
// administrador: organizaciones y campañas. auditoria: revisa, no gestiona.
// organizacion: referente de una organización social.
const ROLES = ["superadmin", "administrador", "auditoria", "organizacion"];

// Letras, números, punto, guion y guion bajo; sin "@" para no confundirse con un email.
const USERNAME = /^[a-z0-9._-]{3,30}$/;

// Costo de bcrypt: 2^10 rondas. Más alto es más lento para el servidor y para
// quien intente adivinar contraseñas.
const COSTO_HASH = 10;

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
        const { _id, passwordHash, ...resto } = ret;
        return { id: _id.toString(), ...resto };
      }
    }
  }
);

// Borrado lógico. El username y el email de un usuario eliminado siguen
// reservados (índice único): no se reasigna la identidad de alguien eliminado.
userSchema.plugin(softDelete);

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
      const err = new Error(`Ya existe un usuario con ese ${campo}: ${valor}`);
      err.statusCode = 409;
      throw err;
    }
  }

  const passwordHash = await bcrypt.hash(password, COSTO_HASH);
  try {
    return await this.create({ username: usernameNormal, name, email: emailNormal, passwordHash, role });
  } catch (err) {
    // exists() no ve a los usuarios eliminados (borrado lógico), pero el índice
    // único sí: su username y su email siguen reservados. La base lo rechaza con
    // el código 11000 (clave duplicada), que acá se convierte en el mismo 409.
    if (err.code === 11000) {
      const campo = Object.keys(err.keyPattern ?? {})[0] ?? "username o email";
      const conflicto = new Error(`Ya existe un usuario con ese ${campo} (eliminado): no puede reutilizarse`);
      conflicto.statusCode = 409;
      throw conflicto;
    }
    throw err;
  }
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
  return (await bcrypt.compare(password, user.passwordHash)) ? user : null;
};

const User = mongoose.model("User", userSchema);

User.ROLES = ROLES;
User.USERNAME = USERNAME;

export default User;
