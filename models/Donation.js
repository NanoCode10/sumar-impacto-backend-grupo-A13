import mongoose from "mongoose";
import softDelete from "../utils/softDelete.js";
import Donor from "./Donor.js";
import Campaign from "./Campaign.js";
import {
  COMISION_SUMAR_IMPACTO,
  GASTOS_PROCESAMIENTO,
  MEDIOS_PAGO,
  redondearDosDecimales
} from "../config/parametros.js";

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
    certificateCode: {
      type: String,
      default: null
    },
    status: {
      type: String,
      enum: { values: STATUSES, message: `status inválido. Permitidos: ${STATUSES.join(", ")}` },
      default: "acreditada"
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

async function comprobarDonanteYCampania(donorId, campaignId) {
  const donor = await Donor.findById(donorId);
  if (!donor) {
    const err = new Error("El donante indicado no existe");
    err.statusCode = 404;
    throw err;
  }
  if (donor.status !== "activo") {
    const err = new Error("El donante no se encuentra activo");
    err.statusCode = 409;
    throw err;
  }

  const campaign = await Campaign.findById(campaignId);
  if (!campaign) {
    const err = new Error("La campaña indicada no existe");
    err.statusCode = 404;
    throw err;
  }
  if (campaign.status !== "activa") {
    const err = new Error(`La campaña está en estado ${campaign.status} y no puede recibir donaciones`);
    err.statusCode = 409;
    throw err;
  }
}

function calcularImportes(grossAmount, paymentMethod) {
  const commission = redondearDosDecimales(grossAmount * COMISION_SUMAR_IMPACTO);
  const processingFees = redondearDosDecimales(grossAmount * GASTOS_PROCESAMIENTO[paymentMethod]);
  const netAmount = redondearDosDecimales(grossAmount - commission - processingFees);
  return { commission, processingFees, netAmount };
}

donationSchema.statics.buscarTodas = function (filtros = {}) {
  return this.find(filtros).sort({ _id: -1 });
};

donationSchema.statics.crear = async function (datos) {
  await comprobarDonanteYCampania(datos.donorId, datos.campaignId);

  const grossAmount = datos.grossAmount;
  const importes = calcularImportes(grossAmount, datos.paymentMethod);
  const certificateCode = `CERT-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

  return this.create({
    donorId: datos.donorId,
    campaignId: datos.campaignId,
    grossAmount,
    paymentMethod: datos.paymentMethod,
    ...importes,
    certificateCode,
    status: "acreditada"
  });
};

donationSchema.statics.actualizar = async function (id, datos) {
  const donation = await this.findById(id);
  if (!donation) {
    return null;
  }

  if (datos.campaignId !== undefined && datos.campaignId.toString() !== donation.campaignId.toString()) {
    const err = new Error("Una donación no puede cambiar de campaña (los fondos tienen destino específico)");
    err.statusCode = 409;
    throw err;
  }

  const donorId = datos.donorId ?? donation.donorId;
  if (datos.donorId !== undefined) {
    const donor = await Donor.findById(donorId);
    if (!donor) {
      const err = new Error("El donante indicado no existe");
      err.statusCode = 404;
      throw err;
    }
    if (donor.status !== "activo") {
      const err = new Error("El donante no se encuentra activo");
      err.statusCode = 409;
      throw err;
    }
  }

  const grossAmount = datos.grossAmount ?? donation.grossAmount;
  const paymentMethod = datos.paymentMethod ?? donation.paymentMethod;
  const importes = calcularImportes(grossAmount, paymentMethod);

  return this.findByIdAndUpdate(
    id,
    {
      donorId,
      grossAmount,
      paymentMethod,
      ...importes
    },
    { returnDocument: "after", runValidators: true }
  );
};

donationSchema.statics.anular = async function (id) {
  const donation = await this.findById(id);
  if (!donation) {
    return null;
  }

  donation.deletedAt = new Date();
  donation.status = "anulada";
  await donation.save();
  return donation;
};

const Donation = mongoose.model("Donation", donationSchema);
Donation.STATUSES = STATUSES;
export default Donation;
