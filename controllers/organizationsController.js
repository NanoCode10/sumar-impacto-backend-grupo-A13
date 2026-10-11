const Organization = require("../models/Organization");

/**
 * RESPONSABILIDAD DE LA CAPA CONTROLLER
 * El controller traduce entre HTTP y el Model:
 *  - lee lo que llega en req (params, query, body);
 *  - llama al Model correspondiente (Organization) usando métodos de Mongoose con async/await;
 *  - decide el status HTTP y el cuerpo de la respuesta (res);
 *  - delega el manejo de errores al middleware de errores llamando a next(err).
 *  - NO contiene lógica de persistencia (eso es del Model).
 *
 */

/**
 * GET /organizations/:id -> renderiza la vista de una organización.
 */
async function getOrganizationById(req, res, next) {
  try {
    const organization = await Organization.findById(req.params.id);

    if (!organization) {
      return res.status(404).json({ error: "Organización no encontrada" });
    }

    res.render("organization", { organization });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /organizations -> devuelve todas las organizaciones en formato JSON.
 */
async function getOrganizations(req, res, next) {
  try {
    const organizations = await Organization.find();
    res.status(200).json(organizations);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /organizations -> crea una nueva organización.
 */
async function createOrganization(req, res, next) {
  try {
    const { name, type, email, status } = req.body;

    if (!name || !type || !email) {
      return res.status(400).json({ error: "Nombre, tipo y email son campos obligatorios" });
    }

    const newOrganization = await Organization.create({ name, type, email, status });
    res.status(201).json(newOrganization);
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /organizations/:id -> actualiza una organización existente.
 */
async function updateOrganization(req, res, next) {
  try {
    const { name, type, email, status } = req.body;

    const updatedOrganization = await Organization.findByIdAndUpdate(
      req.params.id,
      { name, type, email, status },
      { new: true, runValidators: true }
    );

    if (!updatedOrganization) {
      return res.status(404).json({ error: "Organización no encontrada" });
    }

    res.status(200).json(updatedOrganization);
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /organizations/:id -> elimina una organización.
 */
async function deleteOrganization(req, res, next) {
  try {
    const deletedOrganization = await Organization.findByIdAndDelete(req.params.id);

    if (!deletedOrganization) {
      return res.status(404).json({ error: "Organización no encontrada" });
    }

    res.status(200).json({
      message: "Organización eliminada correctamente",
      organization: deletedOrganization,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getOrganizationById,
  getOrganizations,
  createOrganization,
  updateOrganization,
  deleteOrganization,
};
