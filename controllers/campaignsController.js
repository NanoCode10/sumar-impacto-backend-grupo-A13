const Campaign = require("../models/Campaign");

/**
 * RESPONSABILIDAD DE LA CAPA CONTROLLER
 * Igual que organizationsController: traduce entre HTTP y el Model.
 *
 * La diferencia es el try/catch: Campaign.create y Campaign.update lanzan un Error
 * con statusCode cuando la organización referenciada no existe (404) o no está
 * aprobada (409), porque el Model no tiene res para responder. Acá esa excepción
 * se captura y se delega con next(err) al errorHandler global
 * (middlewares/errors.js), que arma la respuesta HTTP.
 */

/**
 * GET /api/campaigns  -> listado, con filtros opcionales por organizationId y status.
 * Los filtros los valida y canoniza validateQuery, que los deja en req.filtros.
 */
function getCampaigns(req, res) {
  const campaigns = Campaign.findAll(req.filtros);
  res.status(200).json(campaigns);
}

/**
 * GET /api/campaigns/:id  -> una campaña en JSON.
 */
function getCampaignById(req, res) {
  const id = Number(req.params.id);
  const campaign = Campaign.findById(id);

  if (!campaign) {
    return res.status(404).json({ error: "Campaña no encontrada" });
  }

  res.status(200).json(campaign);
}

/**
 * GET /campaigns/:id  -> la misma campaña, como página Pug.
 */
function renderCampaign(req, res, next) {
  const id = Number(req.params.id);
  const campaign = Campaign.findById(id);

  // Es una página HTML: el 404 lo arma el errorHandler con la vista error.pug.
  if (!campaign) {
    const err = new Error("Campaña no encontrada");
    err.statusCode = 404;
    return next(err);
  }

  res.render("campaign", { campaign });
}

/**
 * POST /api/campaigns  -> crea una campaña.
 */
function createCampaign(req, res, next) {
  const { title, description, targetAmount, status, organizationId } = req.body;

  try {
    const newCampaign = Campaign.create({ title, description, targetAmount, status, organizationId });
    res.status(201).json(newCampaign);
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/campaigns/:id  -> actualiza una campaña existente.
 */
function updateCampaign(req, res, next) {
  const id = Number(req.params.id);
  const { title, description, targetAmount, status, organizationId } = req.body;

  try {
    const updatedCampaign = Campaign.update(id, { title, description, targetAmount, status, organizationId });

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
function deleteCampaign(req, res) {
  const id = Number(req.params.id);
  const deletedCampaign = Campaign.delete(id);

  if (!deletedCampaign) {
    return res.status(404).json({ error: "Campaña no encontrada" });
  }

  res.status(200).json({ message: "Campaña eliminada correctamente", campaign: deletedCampaign });
}

module.exports = {
  getCampaigns,
  getCampaignById,
  renderCampaign,
  createCampaign,
  updateCampaign,
  deleteCampaign
};
