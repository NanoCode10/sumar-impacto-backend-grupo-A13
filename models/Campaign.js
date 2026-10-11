const mongoose = require("mongoose");

/**
 * RESPONSABILIDAD DEL MODELO
 * Campaign es el Model del dominio "campaña". Se encarga de:
 *  - definir el esquema (estructura y validaciones) de una campaña en MongoDB;
 *  - referenciar a la Organization a la que pertenece mediante su ObjectId;
 *  - ofrecer los métodos de Mongoose para acceso a datos (find, findById, create, etc.).
 * La capa de controllers NO accede directamente a la base de datos: siempre pasa por este Model.
 *
 * ATRIBUTOS DE UNA INSTANCIA
 *  - organizationId {ObjectId}  Referencia a la Organization dueña de la campaña. Obligatorio.
 *  - title          {String}    Título de la campaña. Obligatorio.
 *  - description    {String}    Descripción de la campaña. Obligatorio.
 *  - targetAmount   {Number}    Monto objetivo a recaudar. Obligatorio. Debe ser >= 0.
 *  - status         {String}    Estado de la campaña. Valores permitidos: "active", "closed".
 *                               Por defecto: "active".
 */
const campaignSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: [true, "La organización a la que pertenece la campaña es obligatoria"],
    },
    title: {
      type: String,
      required: [true, "El título de la campaña es obligatorio"],
      trim: true,
    },
    description: {
      type: String,
      required: [true, "La descripción de la campaña es obligatoria"],
      trim: true,
    },
    targetAmount: {
      type: Number,
      required: [true, "El monto objetivo es obligatorio"],
      min: [0, "El monto objetivo debe ser un número positivo"],
    },
    status: {
      type: String,
      enum: {
        values: ["active", "closed"],
        message: "El estado debe ser 'active' o 'closed'",
      },
      default: "active",
    },
  },
  {
    // Agrega automáticamente los campos createdAt y updatedAt
    timestamps: true,
  }
);

module.exports = mongoose.model("Campaign", campaignSchema);
