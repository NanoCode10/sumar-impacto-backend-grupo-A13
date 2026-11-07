import mongoose from "mongoose";
import softDelete from "../utils/softDelete.js";
import Donor from "./Donor.js";
import Campaign from "./Campaign.js";
import Counter from "./Counter.js";
import {
  COMISION_SUMAR_IMPACTO,
  GASTOS_PROCESAMIENTO,
  MEDIOS_PAGO,
  redondearDosDecimales
} from "../config/parametros.js";

/**
 * MODELO Donation (Mongoose)
 * Una donación es un comprobante: una vez acreditada no se modifica. Si hay un error
 * se ANULA (cambia el estado y queda registrada la fecha) y se registra una nueva.
 * La anulada sigue consultable: conserva la historia, que es lo que pide la trazabilidad.
 */

const STATUSES = ["acreditada", "anulada"];

const donationSchema = new mongoose.Schema(
  {
    donorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Donor",
      required: [true, "donorId es obligatorio"]
    },
    campaignId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Campaign",
      required: [true, "campaignId es obligatorio"]
    },
    grossAmount: {
      type: Number,
      required: [true, "grossAmount es obligatorio"],
      validate: {
        validator: (valor) => valor > 0,
        message: "grossAmount debe ser un número mayor a 0"
      }
    },
    paymentMethod: {
      type: String,
      required: [true, "paymentMethod es obligatorio"],
      enum: { values: MEDIOS_PAGO, message: `paymentMethod inválido. Permitidos: ${MEDIOS_PAGO.join(", ")}` }
    },
    commission: {
      type: Number,
      required: true
    },
    processingFees: {
      type: Number,
      required: true
    },
    netAmount: {
      type: Number,
      required: true
    },
    // Número de certificado correlativo (CERT-000001, CERT-000002...): único e irrepetible.
    certificateCode: {
      type: String,
      required: true,
      unique: true
    },
    status: {
      type: String,
      enum: { values: STATUSES, message: `status inválido. Permitidos: ${STATUSES.join(", ")}` },
      default: "acreditada"
    },
    annulledAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true,
    toJSON: {
      versionKey: false,
      transform: (doc, ret) => {
        const { _id, ...resto } = ret;
        return {
          id: _id.toString(),
          donorId: ret.donorId?.toString ? ret.donorId.toString() : ret.donorId,
          campaignId: ret.campaignId?.toString ? ret.campaignId.toString() : ret.campaignId,
          ...resto
        };
      }
    }
  }
);

donationSchema.plugin(softDelete);

function errorConCodigo(mensaje, statusCode) {
  const err = new Error(mensaje);
  err.statusCode = statusCode;
  return err;
}

async function comprobarDonanteYCampania(donorId, campaignId) {
  const donor = await Donor.findById(donorId);
  if (!donor) {
    throw errorConCodigo("El donante indicado no existe", 404);
  }
  if (donor.status !== "activo") {
    throw errorConCodigo("El donante no se encuentra activo", 409);
  }

  const campaign = await Campaign.findById(campaignId);
  if (!campaign) {
    throw errorConCodigo("La campaña indicada no existe", 404);
  }
  if (campaign.status !== "activa") {
    throw errorConCodigo(`La campaña está en estado ${campaign.status} y no puede recibir donaciones`, 409);
  }
}

function calcularImportes(grossAmount, paymentMethod) {
  const commission = redondearDosDecimales(grossAmount * COMISION_SUMAR_IMPACTO);
  const processingFees = redondearDosDecimales(grossAmount * GASTOS_PROCESAMIENTO[paymentMethod]);
  const netAmount = redondearDosDecimales(grossAmount - commission - processingFees);
  return { commission, processingFees, netAmount };
}

// Próximo número de certificado: CERT- y seis dígitos, sin saltos ni repeticiones.
async function siguienteCertificado() {
  const numero = await Counter.siguiente("certificados");
  return `CERT-${String(numero).padStart(6, "0")}`;
}

/**
 * Donaciones, la más reciente primero. Incluye las anuladas: se filtran con ?status=.
 */
donationSchema.statics.buscarTodas = function (filtros = {}) {
  return this.find(filtros).sort({ _id: -1 });
};

donationSchema.statics.crear = async function (datos) {
  await comprobarDonanteYCampania(datos.donorId, datos.campaignId);

  const grossAmount = datos.grossAmount;
  const importes = calcularImportes(grossAmount, datos.paymentMethod);

  return this.create({
    donorId: datos.donorId,
    campaignId: datos.campaignId,
    grossAmount,
    paymentMethod: datos.paymentMethod,
    ...importes,
    certificateCode: await siguienteCertificado(),
    status: "acreditada"
  });
};

/**
 * Anula una donación: cambia el estado y registra la fecha. No la borra: sigue
 * consultable. Devuelve la donación anulada, o null si no existe; 409 si ya lo estaba.
 */
donationSchema.statics.anular = async function (id) {
  const donation = await this.findById(id);
  if (!donation) {
    return null;
  }
  if (donation.status === "anulada") {
    throw errorConCodigo("La donación ya está anulada", 409);
  }

  donation.status = "anulada";
  donation.annulledAt = new Date();
  await donation.save();
  return donation;
};

const Donation = mongoose.model("Donation", donationSchema);
Donation.STATUSES = STATUSES;
export default Donation;
