const mongoose = require("mongoose");

/**
 * Modelo Organization
 *
 * Atributos:
 *  - name   {String}  Nombre de la organización. Obligatorio.
 *  - type   {String}  Tipo/categoría de la organización (ej: "ONG", "fundación"). Obligatorio.
 *  - email  {String}  Email de contacto. Obligatorio.
 *  - status {String}  Estado de la organización. Valores permitidos: "active", "inactive", "approved".
 *                     Por defecto: "approved".
 */
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
        values: ["active", "inactive", "approved"],
        message: "El estado debe ser 'active', 'inactive' o 'approved'",
      },
      default: "approved",
    },
  },
  {
    // Agrega automáticamente los campos createdAt y updatedAt
    timestamps: true,
  }
);

module.exports = mongoose.model("Organization", organizationSchema);
