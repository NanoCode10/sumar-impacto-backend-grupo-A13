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
    // DNI o CUIT, guardado normalizado (ver normalizarDocumento). Único: un mismo donante
    // no puede figurar dos veces, porque los certificados se emiten a su nombre.
    document: {
      type: String,
      required: [true, "document es obligatorio"],
      trim: true,
      unique: true
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

function conflicto(mensaje) {
  const err = new Error(mensaje);
  err.statusCode = 409;
  return err;
}

// "20-12345678-9", "20.123.456.789" y "20123456789" son el mismo documento: se guarda
// sin espacios, puntos ni guiones, y en mayúsculas (pasaportes con letras).
export function normalizarDocumento(documento) {
  return documento.trim().toUpperCase().replace(/[\s.-]/g, "");
}

// El índice único también ve a los donantes eliminados (borrado lógico): su documento
// sigue reservado. La base lo rechaza con el código 11000, que se convierte en el mismo 409.
function conflictoPorDuplicado(err) {
  return err.code === 11000 ? conflicto("Ya existe un donante (eliminado) con ese documento") : err;
}

async function comprobarDocumentoLibre(Modelo, documento, idPropio) {
  const otro = await Modelo.findOne({ document: documento });
  if (otro && otro.id !== idPropio) {
    throw conflicto(`Ya existe un donante con el documento ${documento}`);
  }
}

donorSchema.statics.buscarTodos = function (filtros = {}) {
  return this.find(filtros).sort({ _id: 1 });
};

donorSchema.statics.crear = async function (datos) {
  const document = normalizarDocumento(datos.document);
  await comprobarDocumentoLibre(this, document);
  try {
    return await this.create(soloDefinidos({ ...datos, document }));
  } catch (err) {
    throw conflictoPorDuplicado(err);
  }
};

donorSchema.statics.actualizar = async function (id, datos) {
  const existe = await this.exists({ _id: id });
  if (!existe) {
    return null;
  }

  const cambios = soloDefinidos(datos);
  if (cambios.document !== undefined) {
    cambios.document = normalizarDocumento(cambios.document);
    await comprobarDocumentoLibre(this, cambios.document, id);
  }
  try {
    return await this.findByIdAndUpdate(id, cambios, { returnDocument: "after", runValidators: true });
  } catch (err) {
    throw conflictoPorDuplicado(err);
  }
};

/**
 * Elimina un donante (borrado lógico). Si tiene donaciones, incluso anuladas, no se
 * elimina (409): son parte de la historia de los certificados. Se puede pasar a inactivo.
 */
donorSchema.statics.eliminar = async function (id) {
  const donor = await this.findById(id);
  if (!donor) {
    return null;
  }

  // Donation importa Donor: se toma el modelo ya registrado para no armar un import circular.
  const cantidad = (await mongoose.models.Donation?.countDocuments({ donorId: id })) ?? 0;
  if (cantidad > 0) {
    throw conflicto(
      `El donante «${donor.name}» tiene ${cantidad} donación(es) y no puede eliminarse; puede pasarlo a inactivo`
    );
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
