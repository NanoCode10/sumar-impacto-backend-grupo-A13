const Campaign = require("../models/Campaign");
const Organization = require("../models/Organization");

/**
 * RESPONSABILIDAD DE LA CAPA CONTROLLER
 * El controller traduce entre HTTP y el Model:
 *  - lee lo que llega en req (params, query, body);
 *  - llama al Model correspondiente (Campaign) usando métodos de Mongoose con async/await;
 *  - decide el status HTTP y el cuerpo de la respuesta (res);
 *  - delega el manejo de errores al middleware de errores llamando a next(err).
 *  - NO contiene lógica de persistencia (eso es del Model).
 */

/**
 * GET /campaigns/:id -> renderiza la vista de una campaña.
 */
async function getCampaignById(req, res, next) {
  try {
    // populate() reemplaza el ObjectId de organizationId por los datos reales de la organización
    const campaign = await Campaign.findById(req.params.id).populate("organizationId");

    if (!campaign) {
      return res.status(404).json({ error: "Campaña no encontrada" });
    }

    res.render("campaign", { campaign });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /campaigns -> devuelve todas las campañas en formato JSON.
 */
async function getCampaigns(req, res, next) {
  try {
    const campaigns = await Campaign.find().populate("organizationId");
    res.status(200).json(campaigns);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /campaigns -> crea una nueva campaña.
 * Valida que la organización referenciada exista antes de crear.
 */
async function createCampaign(req, res, next) {
  try {
    const { title, description, targetAmount, status, organizationId } = req.body;

    if (!title || !description || !targetAmount || !organizationId) {
      return res.status(400).json({
        error: "Título, descripción, monto objetivo y organización son obligatorios",
      });
    }

    // Validar que la organización referenciada exista
    const org = await Organization.findById(organizationId);
    if (!org) {
      return res.status(404).json({ error: "La organización indicada no existe" });
    }

    const newCampaign = await Campaign.create({
      title,
      description,
      targetAmount,
      status,
      organizationId,
    });

    res.status(201).json(newCampaign);
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /campaigns/:id -> actualiza una campaña existente.
 */
async function updateCampaign(req, res, next) {
  try {
    const { title, description, targetAmount, status, organizationId } = req.body;

    // Si se cambia la organización, validar que la nueva exista
    if (organizationId) {
      const org = await Organization.findById(organizationId);
      if (!org) {
        return res.status(404).json({ error: "La organización indicada no existe" });
      }
    }

    const updatedCampaign = await Campaign.findByIdAndUpdate(
      req.params.id,
      { title, description, targetAmount, status, organizationId },
      { new: true, runValidators: true }
    );

    if (!updatedCampaign) {
      return res.status(404).json({ error: "Campaña no encontrada" });
    }

    res.status(200).json(updatedCampaign);
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /campaigns/:id -> elimina una campaña.
 */
async function deleteCampaign(req, res, next) {
  try {
    const deletedCampaign = await Campaign.findByIdAndDelete(req.params.id);

    if (!deletedCampaign) {
      return res.status(404).json({ error: "Campaña no encontrada" });
    }

    res.status(200).json({
      message: "Campaña eliminada correctamente",
      campaign: deletedCampaign,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getCampaignById,
  getCampaigns,
  createCampaign,
  updateCampaign,
  deleteCampaign,
};
