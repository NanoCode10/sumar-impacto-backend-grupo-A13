const mongoose = require("mongoose");

/**
 * Modelo Organization
 *
 * Atributos:
 *  - name   {String}  Nombre de la organización. Obligatorio.
 *  - type   {String}  Tipo. Valores permitidos: "ONG", "fundación", "comedor".
 *  - email  {String}  Email de contacto. Obligatorio.
 *  - status {String}  Estado. Valores permitidos: "pendiente", "aprobada", "suspendida", "baja".
 *                     Por defecto: "pendiente".
 */

/** Constantes exportadas para que los middlewares de validación las puedan reutilizar */
const TYPES = ["ONG", "fundación", "comedor"];
const STATUSES = ["pendiente", "aprobada", "suspendida", "baja"];

/** Único estado que habilita a tener campañas. */
const APPROVED = "aprobada";

const organizationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "El nombre de la organización es obligatorio"],
      trim: true,
    },
    type: {
      type: String,
      required: [true, "El tipo de organización es obligatorio"],
      enum: {
        values: TYPES,
        message: `El tipo debe ser uno de: ${TYPES.join(", ")}`,
      },
      trim: true,
    },
    email: {
      type: String,
      required: [true, "El email de contacto es obligatorio"],
      trim: true,
      lowercase: true,
    },
    status: {
      type: String,
      enum: {
        values: STATUSES,
        message: `El estado debe ser uno de: ${STATUSES.join(", ")}`,
      },
      default: "pendiente",
    },
  },
  {
    // Agrega automáticamente los campos createdAt y updatedAt
    timestamps: true,
  }
);

const Organization = mongoose.model("Organization", organizationSchema);

Organization.TYPES = TYPES;
Organization.STATUSES = STATUSES;
Organization.APPROVED = APPROVED;

module.exports = Organization;
