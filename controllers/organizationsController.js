import Organization from "../models/Organization.js";
import Campaign from "../models/Campaign.js";

/**
 * RESPONSABILIDAD DE LA CAPA CONTROLLER
 * El controller traduce entre HTTP y el Model:
 *  - lee lo que llega en req (params, query, body);
 *  - llama al Model correspondiente (Organization, y Campaign para listar sus campañas);
 *  - decide el status HTTP y el cuerpo de la respuesta (res);
 *  - NO accede a la base directamente ni contiene reglas de negocio (eso es del Model).
 *
 * Las consultas a MongoDB son asincrónicas: cada función es async y espera al
 * Model con await. Si algo falla (un 409 del Model o un error de la base), el
 * catch lo delega con next(err) al errorHandler global (middlewares/errors.js).
 *
 * Los campos obligatorios, los tipos y los valores permitidos los controla antes
 * middlewares/validateBody.js, que además deja en req.body el valor canónico.
 *
 * Las funciones de la API (bajo /api) responden JSON. renderOrganization y
 * renderOrganizations responden HTML y las usa routes/viewsRoutes.js.
 */

/**
 * GET /api/organizations  -> listado, con filtros opcionales por type y status.
 * Los filtros los valida y canoniza validateQuery, que los deja en req.filtros.
 */
async function getOrganizations(req, res, next) {
  try {
    const organizations = await Organization.buscarTodas(req.filtros);
    res.status(200).json(organizations);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/organizations/:id/campaigns  -> las campañas de una organización.
 */
async function getOrganizationCampaigns(req, res, next) {
  try {
    const { id } = req.params;
    const organization = await Organization.findById(id);

    if (!organization) {
      return res.status(404).json({ error: "Organización no encontrada" });
    }

    const campaigns = await Campaign.buscarTodas({ organizationId: id });
    res.status(200).json(campaigns);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/organizations/:id  -> una organización en JSON.
 */
async function getOrganizationById(req, res, next) {
  try {
    const organization = await Organization.findById(req.params.id);

    if (!organization) {
      return res.status(404).json({ error: "Organización no encontrada" });
    }

    res.status(200).json(organization);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /organizations/:id  -> la misma organización, como página Pug.
 */
async function renderOrganization(req, res, next) {
  try {
    const organization = await Organization.findById(req.params.id);

    // Es una página HTML: el 404 lo arma el errorHandler con la vista error.pug.
    if (!organization) {
      const err = new Error("Organización no encontrada");
      err.statusCode = 404;
      return next(err);
    }

    res.render("organization", { organization });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /organizations  -> página de gestión de organizaciones.
 * La tabla no se arma acá: la completa el navegador con fetch() contra la API
 * (public/js/organizations.js). Sólo se pasan los valores permitidos para los
 * <select>, así siguen definidos una única vez en el Model.
 */
function renderOrganizations(req, res) {
  res.render("organizations", {
    title: "Organizaciones - SumarImpacto",
    types: Organization.TYPES,
    statuses: Organization.STATUSES
  });
}

/**
 * POST /api/organizations  -> crea una organización.
 * Si no se envía status, el schema aplica su valor por defecto (pendiente).
 */
async function createOrganization(req, res, next) {
  try {
    const { name, type, email, status } = req.body;

    const newOrganization = await Organization.create({ name, type, email, status });
    res.status(201).json(newOrganization);
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/organizations/:id  -> actualiza una organización existente.
 */
async function updateOrganization(req, res, next) {
  try {
    const { name, type, email, status } = req.body;

    const updatedOrganization = await Organization.actualizar(req.params.id, { name, type, email, status });

    if (!updatedOrganization) {
      return res.status(404).json({ error: "Organización no encontrada" });
    }

    res.status(200).json(updatedOrganization);
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/organizations/:id  -> elimina una organización.
 * Organization.eliminar lanza un 409 si la organización todavía tiene campañas.
 */
async function deleteOrganization(req, res, next) {
  try {
    const deletedOrganization = await Organization.eliminar(req.params.id);

    if (!deletedOrganization) {
      return res.status(404).json({ error: "Organización no encontrada" });
    }

    res.status(200).json({ message: "Organización eliminada correctamente", organization: deletedOrganization });
  } catch (err) {
    next(err);
  }
}

export {
  getOrganizations,
  getOrganizationCampaigns,
  getOrganizationById,
  renderOrganization,
  renderOrganizations,
  createOrganization,
  updateOrganization,
  deleteOrganization
};
