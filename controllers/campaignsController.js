import Campaign from "../models/Campaign.js";
import Organization from "../models/Organization.js";

/**
 * RESPONSABILIDAD DE LA CAPA CONTROLLER
 * Igual que organizationsController: traduce entre HTTP y el Model, con
 * funciones async que esperan al Model con await.
 *
 * Campaign.crear y Campaign.actualizar lanzan un Error con statusCode cuando la
 * organización referenciada no existe (404) o no está aprobada (409), porque el
 * Model no tiene res para responder. Acá esa excepción se captura y se delega
 * con next(err) al errorHandler global (middlewares/errors.js), que arma la
 * respuesta HTTP.
 */

/**
 * GET /api/campaigns  -> listado, con filtros opcionales por organizationId y status.
 * Los filtros los valida y canoniza validateQuery, que los deja en req.filtros.
 */
async function getCampaigns(req, res, next) {
  try {
    const campaigns = await Campaign.buscarTodas(req.filtros);
    res.status(200).json(campaigns);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/campaigns/:id  -> una campaña en JSON.
 */
async function getCampaignById(req, res, next) {
  try {
    const campaign = await Campaign.findById(req.params.id);

    if (!campaign) {
      return res.status(404).json({ error: "Campaña no encontrada" });
    }

    res.status(200).json(campaign);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /campaigns/:id  -> la misma campaña, como página Pug.
 */
async function renderCampaign(req, res, next) {
  try {
    // populate sólo en las páginas: trae nombre y estado de la organización para
    // mostrarla. La API devuelve organizationId como id, sin populate.
    const campaign = await Campaign.findById(req.params.id).populate("organizationId", "name status");

    // Sin sesión, sólo las activas de organizaciones aprobadas: igual que la home
    // pública. Para el público, cualquier otra no existe (404).
    const visible =
      campaign &&
      (req.session.user ||
        (campaign.status === "activa" && campaign.organizationId?.status === Organization.APPROVED));

    // Es una página HTML: el 404 lo arma el errorHandler con la vista error.pug.
    if (!visible) {
      const err = new Error("Campaña no encontrada");
      err.statusCode = 404;
      return next(err);
    }

    res.render("campaign", { campaign });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /campaigns  -> página de gestión de campañas.
 * Igual que renderOrganizations: la tabla y el <select> de organizaciones los
 * completa el navegador con fetch() (public/js/campaigns.js). Acá sólo se pasan
 * los estados permitidos, definidos una única vez en el Model.
 */
function renderCampaigns(req, res) {
  res.render("campaigns", {
    title: "Campañas - SumarImpacto",
    statuses: Campaign.STATUSES
  });
}

/**
 * POST /api/campaigns  -> crea una campaña.
 */
async function createCampaign(req, res, next) {
  try {
    const { title, description, targetAmount, status, organizationId } = req.body;

    const newCampaign = await Campaign.crear({ title, description, targetAmount, status, organizationId });
    res.status(201).json(newCampaign);
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/campaigns/:id  -> actualiza una campaña existente.
 */
async function updateCampaign(req, res, next) {
  try {
    const { title, description, targetAmount, status, organizationId } = req.body;

    const updatedCampaign = await Campaign.actualizar(req.params.id, {
      title,
      description,
      targetAmount,
      status,
      organizationId
    });

    if (!updatedCampaign) {
      return res.status(404).json({ error: "Campaña no encontrada" });
    }

    res.status(200).json(updatedCampaign);
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/campaigns/:id  -> elimina una campaña.
 */
async function deleteCampaign(req, res, next) {
  try {
    const deletedCampaign = await Campaign.eliminar(req.params.id);

    if (!deletedCampaign) {
      return res.status(404).json({ error: "Campaña no encontrada" });
    }

    res.status(200).json({ message: "Campaña eliminada correctamente", campaign: deletedCampaign });
  } catch (err) {
    next(err);
  }
}

export {
  getCampaigns,
  getCampaignById,
  renderCampaign,
  renderCampaigns,
  createCampaign,
  updateCampaign,
  deleteCampaign
};
