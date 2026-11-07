import Campaign from "../models/Campaign.js";

/**
 * CONTROL POR PROPIEDAD (RBAC + ABAC)
 * hasRole decide QUÉ puede hacer cada rol; esto decide SOBRE QUÉ DATOS. Un referente
 * (rol "organizacion") gestiona sólo las campañas de su propia organización. Los demás
 * roles no se ven afectados.
 *
 * Va después de hasRole y antes de la validación del body:
 *  - Alta: si no indica organización se usa la suya; si indica otra, 403.
 *  - Edición: la campaña tiene que ser de su organización y no puede pasarla a otra (403).
 */

function prohibido(res, mensaje) {
  return res.status(403).json({ error: mensaje });
}

export async function restringirAOrganizacionPropia(req, res, next) {
  const usuario = req.session.user;
  if (usuario.role !== "organizacion") {
    return next();
  }

  const propia = usuario.organizationId;
  if (!propia) {
    return prohibido(res, "Su usuario no tiene una organización asignada");
  }

  const pedida = req.body?.organizationId;
  if (pedida !== undefined && pedida !== propia) {
    return prohibido(res, "Sólo puede gestionar campañas de su propia organización");
  }

  try {
    if (req.method === "POST") {
      req.body = { ...req.body, organizationId: propia };
      return next();
    }

    // Edición: si la campaña no existe, sigue y el controller responde 404.
    const campania = await Campaign.findById(req.params.id);
    if (campania && campania.organizationId.toString() !== propia) {
      return prohibido(res, "Sólo puede gestionar campañas de su propia organización");
    }
    next();
  } catch (err) {
    next(err);
  }
}
