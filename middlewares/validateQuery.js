import norm from "../utils/norm.js";
import esObjectId from "../utils/objectId.js";
import Organization from "../models/Organization.js";
import Campaign from "../models/Campaign.js";
import User from "../models/User.js";
import Donor from "../models/Donor.js";
import Donation from "../models/Donation.js";
import { MEDIOS_PAGO } from "../config/parametros.js";

/**
 * VALIDACIÓN DE LOS PARÁMETROS DE CONSULTA (?type=ONG&status=aprobada)
 * Tercer validador del proyecto, junto con validateId (el :id de la URL) y
 * validateBody (el cuerpo de la petición).
 *
 * Si un filtro trae un valor que no está en la lista permitida responde 400 con
 * los valores válidos, igual que validateBody: así el cliente se entera de que
 * su filtro está mal en vez de recibir la lista completa como si nada.
 *
 * Deja los valores ya canónicos en req.filtros y no pisa req.query, que queda
 * con lo que mandó el cliente tal cual llegó: así se distingue lo recibido de lo
 * validado. El controller le pasa req.filtros al modelo.
 */

const canonical = (value, allowed) => allowed.find((item) => norm(item) === norm(value));

const invalid = (res, message) => res.status(400).json({ error: message });

function validateOrganizationQuery(req, res, next) {
  const filtros = {};
  const { type, status } = req.query;

  if (type !== undefined) {
    const valor = canonical(type, Organization.TYPES);
    if (!valor) {
      return invalid(res, `type inválido. Valores permitidos: ${Organization.TYPES.join(", ")}`);
    }
    filtros.type = valor;
  }

  if (status !== undefined) {
    const valor = canonical(status, Organization.STATUSES);
    if (!valor) {
      return invalid(res, `status inválido. Valores permitidos: ${Organization.STATUSES.join(", ")}`);
    }
    filtros.status = valor;
  }

  req.filtros = filtros;
  next();
}

function validateCampaignQuery(req, res, next) {
  const filtros = {};
  const { organizationId, status } = req.query;

  if (organizationId !== undefined) {
    if (!esObjectId(organizationId)) {
      return invalid(res, "organizationId debe ser un ObjectId válido (24 caracteres hexadecimales)");
    }
    filtros.organizationId = organizationId;
  }

  if (status !== undefined) {
    const valor = canonical(status, Campaign.STATUSES);
    if (!valor) {
      return invalid(res, `status inválido. Valores permitidos: ${Campaign.STATUSES.join(", ")}`);
    }
    filtros.status = valor;
  }

  req.filtros = filtros;
  next();
}

function validateUserQuery(req, res, next) {
  const filtros = {};
  const { role } = req.query;

  if (role !== undefined) {
    const valor = canonical(role, User.ROLES);
    if (!valor) {
      return invalid(res, `role inválido. Valores permitidos: ${User.ROLES.join(", ")}`);
    }
    filtros.role = valor;
  }

  req.filtros = filtros;
  next();
}

function validateDonorQuery(req, res, next) {
  const filtros = {};
  const { type, status } = req.query;

  if (type !== undefined) {
    const valor = canonical(type, Donor.TYPES);
    if (!valor) {
      return invalid(res, `type inválido. Valores permitidos: ${Donor.TYPES.join(", ")}`);
    }
    filtros.type = valor;
  }

  if (status !== undefined) {
    const valor = canonical(status, Donor.STATUSES);
    if (!valor) {
      return invalid(res, `status inválido. Valores permitidos: ${Donor.STATUSES.join(", ")}`);
    }
    filtros.status = valor;
  }

  req.filtros = filtros;
  next();
}

function validateDonationQuery(req, res, next) {
  const filtros = {};
  const { donorId, campaignId, paymentMethod, status } = req.query;

  for (const [field, value] of Object.entries({ donorId, campaignId })) {
    if (value !== undefined) {
      if (!esObjectId(value)) {
        return invalid(res, `${field} debe ser un ObjectId válido (24 caracteres hexadecimales)`);
      }
      filtros[field] = value;
    }
  }

  if (paymentMethod !== undefined) {
    const valor = canonical(paymentMethod, MEDIOS_PAGO);
    if (!valor) {
      return invalid(res, `paymentMethod inválido. Permitidos: ${MEDIOS_PAGO.join(", ")}`);
    }
    filtros.paymentMethod = valor;
  }

  if (status !== undefined) {
    const valor = canonical(status, Donation.STATUSES);
    if (!valor) {
      return invalid(res, `status inválido. Permitidos: ${Donation.STATUSES.join(", ")}`);
    }
    filtros.status = valor;
  }

  req.filtros = filtros;
  next();
}

export { validateOrganizationQuery, validateCampaignQuery, validateUserQuery, validateDonorQuery, validateDonationQuery };
