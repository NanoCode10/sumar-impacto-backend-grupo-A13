import mongoose from "mongoose";
import softDelete from "../utils/softDelete.js";

const TYPES = ["individual", "corporativo"];
const STATUSES = ["activo", "inactivo"];
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const donorSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "name es obligatorio"],
      trim: true,
      minlength: [3, "name debe tener al menos 3 caracteres"],
      maxlength: [100, "name no puede superar 100 caracteres"]
    },
    type: {
      type: String,
      required: [true, "type es obligatorio"],
      enum: { values: TYPES, message: `type inválido. Valores permitidos: ${TYPES.join(", ")}` }
    },
    document: {
      type: String,
      required: [true, "document es obligatorio"],
      trim: true
    },
    email: {
      type: String,
      required: [true, "email es obligatorio"],
      trim: true,
      lowercase: true,
      match: [EMAIL, "email no tiene un formato válido"]
    },
    isMember: {
      type: Boolean,
      default: false
    },
    status: {
      type: String,
      enum: { values: STATUSES, message: `status inválido. Valores permitidos: ${STATUSES.join(", ")}` },
      default: "activo"
    }
  },
  {
    timestamps: true,
    toJSON: {   
      versionKey: false,
      transform: (doc, ret) => {
        const { _id, ...resto } = ret;
        return { id: _id.toString(), ...resto };
      }
    }
  }
);

donorSchema.plugin(softDelete);

const soloDefinidos = (datos) =>
  Object.fromEntries(Object.entries(datos).filter(([, valor]) => valor !== undefined));

donorSchema.statics.buscarTodos = function (filtros = {}) {
  return this.find(filtros).sort({ _id: 1 });
};

donorSchema.statics.crear = async function (datos) {
  return this.create(soloDefinidos(datos));
};

donorSchema.statics.actualizar = async function (id, datos) {
  const existe = await this.exists({ _id: id });
  if (!existe) {
    return null;
  }

  return this.findByIdAndUpdate(id, soloDefinidos(datos), { returnDocument: "after", runValidators: true });
};

donorSchema.statics.eliminar = async function (id) {
  const donor = await this.findById(id);
  if (!donor) {
    return null;
  }

  donor.deletedAt = new Date();
  donor.status = "inactivo";
  await donor.save();
  return donor;
};

const Donor = mongoose.model("Donor", donorSchema);
Donor.TYPES = TYPES;
Donor.STATUSES = STATUSES;
Donor.EMAIL = EMAIL;

export default Donor;
