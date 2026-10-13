import norm from "../utils/norm.js";
import esObjectId from "../utils/objectId.js";
import Organization from "../models/Organization.js";
import Campaign from "../models/Campaign.js";
import User from "../models/User.js";

/**
 * VALIDACIÓN DE LOS DATOS QUE MANDA EL CLIENTE
 * Corre antes del controller: si algo no cumple, responde 400 y el controller
 * no llega a ejecutarse. Valida campos obligatorios, tipos de datos y valores
 * permitidos, que son tres de los cinco puntos que pide la consigna.
 *
 * El tipo se controla sobre el valor real del JSON, ANTES de normalizar: un texto
 * debe llegar como string y un número como number ("150000" o true dan 400).
 *
 * Cada validador se usa en dos modos:
 *  - "create" (POST): exige los campos obligatorios.
 *  - "update" (PUT): sólo valida los campos que vinieron en el body.
 *
 * Además deja en req.body el VALOR CANÓNICO de cada lista (el de la lista, con
 * su tilde), no lo que escribió el cliente: así en la base hay una sola
 * grafía de cada valor.
 */

// El formato de email se define una sola vez, en el modelo (también lo usa el schema).
const EMAIL = Organization.EMAIL;

const canonical = (value, allowed) => allowed.find((item) => norm(item) === norm(value));

const invalid = (res, message) => res.status(400).json({ error: message });

const missingFields = (body, fields) =>
  fields.filter((field) => body[field] === undefined || body[field] === "");

function validateOrganization(mode) {
  return (req, res, next) => {
    // Sin express.json() o sin body, req.body es undefined: se trata como objeto vacío
    // para responder 400 en lugar de romper al leer sus propiedades.
    const body = req.body ?? {};

    if (mode === "create") {
      const missing = missingFields(body, ["name", "type", "email"]);
      if (missing.length > 0) {
        return invalid(res, `Faltan campos obligatorios: ${missing.join(", ")}`);
      }
    }

    // Primero se valida el tipo real que llegó en el JSON y recién después se
    // normaliza: String(123) o String(null) convertían datos de otro tipo en
    // textos válidos. typeof null es "object", así que null también se rechaza.
    if (body.name !== undefined) {
      if (typeof body.name !== "string") {
        return invalid(res, "name debe ser un texto de 3 a 100 caracteres");
      }
      const name = body.name.trim();
      if (name.length < 3 || name.length > 100) {
        return invalid(res, "name debe ser un texto de 3 a 100 caracteres");
      }
      body.name = name;
    }

    if (body.email !== undefined) {
      if (typeof body.email !== "string") {
        return invalid(res, "email debe ser un texto");
      }
      const email = body.email.trim();
      if (!EMAIL.test(email)) {
        return invalid(res, "email no tiene un formato válido");
      }
      body.email = email;
    }

    if (body.type !== undefined) {
      const type = typeof body.type === "string" && canonical(body.type, Organization.TYPES);
      if (!type) {
        return invalid(res, `type inválido. Valores permitidos: ${Organization.TYPES.join(", ")}`);
      }
      body.type = type;
    }

    if (body.status !== undefined) {
      const status = typeof body.status === "string" && canonical(body.status, Organization.STATUSES);
      if (!status) {
        return invalid(res, `status inválido. Valores permitidos: ${Organization.STATUSES.join(", ")}`);
      }
      body.status = status;
    }

    req.body = body;
    next();
  };
}

function validateCampaign(mode) {
  return (req, res, next) => {
    const body = req.body ?? {};

    if (mode === "create") {
      const missing = missingFields(body, ["title", "description", "targetAmount", "organizationId"]);
      if (missing.length > 0) {
        return invalid(res, `Faltan campos obligatorios: ${missing.join(", ")}`);
      }
    }

    // Mismo criterio que en validateOrganization: tipo real primero, trim después.
    if (body.title !== undefined) {
      if (typeof body.title !== "string") {
        return invalid(res, "title debe ser un texto de 5 a 120 caracteres");
      }
      const title = body.title.trim();
      if (title.length < 5 || title.length > 120) {
        return invalid(res, "title debe ser un texto de 5 a 120 caracteres");
      }
      body.title = title;
    }

    if (body.description !== undefined) {
      if (typeof body.description !== "string") {
        return invalid(res, "description debe ser un texto");
      }
      const description = body.description.trim();
      if (description.length === 0) {
        return invalid(res, "description no puede estar vacía");
      }
      body.description = description;
    }

    // Los números no se convierten con Number(): Number("150000") y Number(true)
    // daban valores válidos. En un body JSON un número llega como number.
    if (body.targetAmount !== undefined) {
      const targetAmount = body.targetAmount;
      if (typeof targetAmount !== "number" || !Number.isFinite(targetAmount) || targetAmount <= 0) {
        return invalid(res, "targetAmount debe ser un número mayor a 0");
      }
    }

    // organizationId es el id de una organización: un ObjectId que llega como texto.
    // Que la organización exista y esté aprobada lo decide el modelo (404/409).
    if (body.organizationId !== undefined) {
      if (!esObjectId(body.organizationId)) {
        return invalid(res, "organizationId debe ser un ObjectId válido (24 caracteres hexadecimales)");
      }
    }

    if (body.status !== undefined) {
      const status = typeof body.status === "string" && canonical(body.status, Campaign.STATUSES);
      if (!status) {
        return invalid(res, `status inválido. Valores permitidos: ${Campaign.STATUSES.join(", ")}`);
      }
      body.status = status;
    }

    req.body = body;
    next();
  };
}

// Largo mínimo de la contraseña. Se valida acá porque el modelo sólo recibe el hash.
const PASSWORD_MIN = 8;

function validateUser(mode) {
  return (req, res, next) => {
    const body = req.body ?? {};

    if (mode === "create") {
      const missing = missingFields(body, ["username", "name", "email", "password"]);
      if (missing.length > 0) {
        return invalid(res, `Faltan campos obligatorios: ${missing.join(", ")}`);
      }
    }

    // El username es la identidad del usuario: se elige en el alta y no se edita.
    if (mode === "update" && body.username !== undefined) {
      return invalid(res, "username no se puede modificar");
    }

    if (body.username !== undefined) {
      const username = typeof body.username === "string" && body.username.trim().toLowerCase();
      if (!username || !User.USERNAME.test(username)) {
        return invalid(res, "username debe tener de 3 a 30 caracteres: letras, números, punto, guion o guion bajo");
      }
      body.username = username;
    }

    // name y email: mismo criterio que en validateOrganization.
    if (body.name !== undefined) {
      if (typeof body.name !== "string") {
        return invalid(res, "name debe ser un texto de 3 a 100 caracteres");
      }
      const name = body.name.trim();
      if (name.length < 3 || name.length > 100) {
        return invalid(res, "name debe ser un texto de 3 a 100 caracteres");
      }
      body.name = name;
    }

    if (body.email !== undefined) {
      if (typeof body.email !== "string") {
        return invalid(res, "email debe ser un texto");
      }
      const email = body.email.trim();
      if (!EMAIL.test(email)) {
        return invalid(res, "email no tiene un formato válido");
      }
      body.email = email;
    }

    // La contraseña no se recorta: un espacio puede ser parte de ella.
    if (body.password !== undefined) {
      if (typeof body.password !== "string" || body.password.length < PASSWORD_MIN) {
        return invalid(res, `password debe ser un texto de al menos ${PASSWORD_MIN} caracteres`);
      }
    }

    if (body.role !== undefined) {
      const role = typeof body.role === "string" && canonical(body.role, User.ROLES);
      if (!role) {
        return invalid(res, `role inválido. Valores permitidos: ${User.ROLES.join(", ")}`);
      }
      body.role = role;
    }

    req.body = body;
    next();
  };
}

// Login: usuario (username o email) y contraseña, los dos textos no vacíos. No se
// controla el largo: una contraseña corta recibe el mismo 401 que una incorrecta.
function validateLogin(req, res, next) {
  const body = req.body ?? {};
  const missing = missingFields(body, ["usuario", "password"]);
  if (missing.length > 0) {
    return invalid(res, `Faltan campos obligatorios: ${missing.join(", ")}`);
  }
  if (typeof body.usuario !== "string" || typeof body.password !== "string") {
    return invalid(res, "usuario y password deben ser textos");
  }
  req.body = body;
  next();
}

export { validateOrganization, validateCampaign, validateUser, validateLogin };
