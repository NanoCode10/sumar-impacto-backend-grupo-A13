import mongoose from "mongoose";

// Import circular: Campaign también importa Organization. Funciona porque los
// dos modelos sólo se usan entre sí DENTRO de los métodos, nunca al cargar el
// módulo. No usar Campaign en código de nivel superior.
import Campaign from "./Campaign.js";

/**
 * MODELO Organization (Mongoose)
 * El schema define los campos, sus tipos y sus validaciones; MongoDB guarda cada
 * organización como un documento de la colección "organizations".
 *
 * Es la segunda capa de validación: la primera es middlewares/validateBody.js,
 * que corre antes del controller y arma los mensajes de error de la API.
 *
 * MÉTODOS
 *  - Propios (en español), con las reglas de negocio:
 *      buscarTodas(filtros), actualizar(id, datos), eliminar(id).
 *  - De Mongoose, usados tal cual donde no hay reglas: findById, create.
 * Los errores de negocio se lanzan como Error con statusCode (el Model no tiene
 * res); el controller los delega al errorHandler.
 */

// Valores permitidos del dominio. Se definen una sola vez y el resto del código
// los referencia (validateBody, validateQuery, vistas).
const TYPES = ["ONG", "fundación", "comedor"];
const STATUSES = ["pendiente", "aprobada", "suspendida", "baja"];

// Único estado que habilita a tener campañas. Se referencia desde Campaign.
const APPROVED = "aprobada";

// Formato de email. Lo usa también validateBody.
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const organizationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "name es obligatorio"],
      trim: true,
      minlength: [3, "name debe ser un texto de 3 a 100 caracteres"],
      maxlength: [100, "name debe ser un texto de 3 a 100 caracteres"]
    },
    type: {
      type: String,
      required: [true, "type es obligatorio"],
      enum: { values: TYPES, message: `type inválido. Valores permitidos: ${TYPES.join(", ")}` }
    },
    email: {
      type: String,
      required: [true, "email es obligatorio"],
      trim: true,
      match: [EMAIL, "email no tiene un formato válido"]
    },
    status: {
      type: String,
      enum: { values: STATUSES, message: `status inválido. Valores permitidos: ${STATUSES.join(", ")}` },
      default: "pendiente"
    }
  },
  {
    // Agrega y mantiene automáticamente createdAt y updatedAt en cada documento.
    timestamps: true,
    // Cómo se convierte a JSON en las respuestas de la API: "id" como texto en
    // lugar de "_id", y sin "__v" (versión interna de Mongoose).
    toJSON: {
      versionKey: false,
      transform: (doc, ret) => {
        const { _id, ...resto } = ret;
        return { id: _id.toString(), ...resto };
      }
    }
  }
);

// Deja sólo los campos que vinieron: en un PUT los demás no se tocan.
const soloDefinidos = (datos) =>
  Object.fromEntries(Object.entries(datos).filter(([, valor]) => valor !== undefined));

/**
 * Organizaciones ordenadas por fecha de alta. Sin filtros, todas.
 * Los filtros ya llegan validados y con el valor canónico (validateQuery), así
 * que se comparan tal cual contra lo guardado.
 * @param {{type?: string, status?: string}} filtros
 */
organizationSchema.statics.buscarTodas = function (filtros = {}) {
  return this.find(filtros).sort({ _id: 1 });
};

/**
 * Actualiza sólo los campos enviados. Devuelve la organización actualizada, o
 * null si no existe.
 */
organizationSchema.statics.actualizar = function (id, datos) {
  // returnDocument: "after" devuelve el documento ya actualizado (en Mongoose 9
  // reemplaza a la opción new: true, que quedó deprecada). runValidators aplica
  // las validaciones del schema también en la actualización.
  return this.findByIdAndUpdate(id, soloDefinidos(datos), { returnDocument: "after", runValidators: true });
};

/**
 * Elimina una organización. Devuelve la organización eliminada, o null si no existe.
 * Regla de negocio: una organización con campañas no se elimina (409), porque
 * esas campañas quedarían apuntando a una organización que ya no existe.
 */
organizationSchema.statics.eliminar = async function (id) {
  const organization = await this.findById(id);
  if (!organization) {
    return null;
  }

  const cantidad = await Campaign.countDocuments({ organizationId: id });
  if (cantidad > 0) {
    const err = new Error(`La organización ${id} tiene ${cantidad} campaña(s) y no puede eliminarse`);
    err.statusCode = 409;
    throw err;
  }

  await organization.deleteOne();
  return organization;
};

const Organization = mongoose.model("Organization", organizationSchema);

Organization.TYPES = TYPES;
Organization.STATUSES = STATUSES;
Organization.APPROVED = APPROVED;
Organization.EMAIL = EMAIL;

export default Organization;
