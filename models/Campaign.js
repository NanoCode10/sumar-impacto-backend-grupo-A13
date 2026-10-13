import mongoose from "mongoose";

// Import circular: Organization también importa Campaign. Funciona porque los
// dos modelos sólo se usan entre sí DENTRO de los métodos, nunca al cargar el
// módulo. No usar Organization en código de nivel superior.
import Organization from "./Organization.js";

/**
 * MODELO Campaign (Mongoose)
 * Cada campaña pertenece a una organización (relación 1:N): organizationId guarda
 * el ObjectId de la organización y "ref" indica a qué modelo apunta.
 *
 * MÉTODOS
 *  - Propios (en español), con las reglas de negocio:
 *      buscarTodas(filtros), crear(datos), actualizar(id, datos).
 *  - De Mongoose, usados tal cual donde no hay reglas: findById, findByIdAndDelete.
 * Regla: toda campaña pertenece a una organización existente (si no, 404) y
 * aprobada (si no, 409), al crearla y también al moverla a otra organización.
 */

const STATUSES = ["borrador", "activa", "suspendida", "cerrada"];

const campaignSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: [true, "organizationId es obligatorio"]
    },
    title: {
      type: String,
      required: [true, "title es obligatorio"],
      trim: true,
      minlength: [5, "title debe ser un texto de 5 a 120 caracteres"],
      maxlength: [120, "title debe ser un texto de 5 a 120 caracteres"]
    },
    description: {
      type: String,
      required: [true, "description es obligatoria"],
      trim: true
    },
    targetAmount: {
      type: Number,
      required: [true, "targetAmount es obligatorio"],
      validate: {
        validator: (valor) => valor > 0,
        message: "targetAmount debe ser un número mayor a 0"
      }
    },
    status: {
      type: String,
      enum: { values: STATUSES, message: `status inválido. Valores permitidos: ${STATUSES.join(", ")}` },
      default: "borrador"
    }
  },
  {
    // Agrega y mantiene automáticamente createdAt y updatedAt en cada documento.
    timestamps: true,
    // "id" como texto en lugar de "_id", y sin "__v". organizationId (ObjectId)
    // también sale como texto en el JSON de la respuesta.
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
 * Comprueba que la organización exista (404) y esté aprobada (409).
 * Se usa al crear y al mover una campaña: si no, se podría esquivar la regla.
 */
async function comprobarOrganizacion(organizationId) {
  const org = await Organization.findById(organizationId);
  if (!org) {
    const err = new Error("La organización indicada no existe");
    err.statusCode = 404;
    throw err;
  }

  if (org.status !== Organization.APPROVED) {
    const err = new Error(`La organización ${org.id} está en estado ${org.status} y no puede recibir campañas`);
    err.statusCode = 409;
    throw err;
  }
}

/**
 * Campañas ordenadas por fecha de alta. Sin filtros, todas.
 * @param {{organizationId?: string, status?: string}} filtros
 */
campaignSchema.statics.buscarTodas = function (filtros = {}) {
  return this.find(filtros).sort({ _id: 1 });
};

/**
 * Crea una campaña para una organización existente y aprobada.
 */
campaignSchema.statics.crear = async function (datos) {
  await comprobarOrganizacion(datos.organizationId);
  return this.create(soloDefinidos(datos));
};

/**
 * Actualiza sólo los campos enviados. Devuelve la campaña actualizada, o null
 * si no existe. Si cambia organizationId, la nueva organización debe existir
 * y estar aprobada.
 */
campaignSchema.statics.actualizar = async function (id, datos) {
  const existe = await this.exists({ _id: id });
  if (!existe) {
    return null;
  }

  if (datos.organizationId !== undefined) {
    await comprobarOrganizacion(datos.organizationId);
  }

  // returnDocument: "after" devuelve el documento ya actualizado (reemplaza a new: true).
  return this.findByIdAndUpdate(id, soloDefinidos(datos), { returnDocument: "after", runValidators: true });
};

const Campaign = mongoose.model("Campaign", campaignSchema);

Campaign.STATUSES = STATUSES;

export default Campaign;
