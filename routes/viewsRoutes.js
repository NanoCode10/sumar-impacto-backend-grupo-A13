const express = require("express");

const validateId = require("../middlewares/validateId");
const { renderHome } = require("../controllers/viewsController");
const { renderOrganization, renderOrganizations } = require("../controllers/organizationsController");
const { renderCampaign, renderCampaigns } = require("../controllers/campaignsController");

/**
 * Páginas HTML generadas con Pug. Son las únicas rutas que usan res.render;
 * la API vive bajo /api y siempre responde JSON.
 * El Router sólo define las rutas: Router -> Controller -> Model -> vista Pug.
 */
const router = express.Router();

router.get("/", renderHome);

// Página de gestión: los datos los pide el navegador con fetch() a /api/organizations.
router.get("/organizations", renderOrganizations);
router.get("/organizations/:id", validateId, renderOrganization);
// Página de gestión: los datos los pide el navegador con fetch() a /api/campaigns.
router.get("/campaigns", renderCampaigns);
router.get("/campaigns/:id", validateId, renderCampaign);

module.exports = router;
