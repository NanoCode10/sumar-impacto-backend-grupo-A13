import express from "express";

import validateId from "../middlewares/validateId.js";
import { renderHome, renderLogin } from "../controllers/viewsController.js";
import { renderOrganization, renderOrganizations } from "../controllers/organizationsController.js";
import { renderCampaign, renderCampaigns } from "../controllers/campaignsController.js";
import { renderUsers } from "../controllers/usersController.js";

/**
 * Páginas HTML generadas con Pug. Son las únicas rutas que usan res.render;
 * la API vive bajo /api y siempre responde JSON.
 * El Router sólo define las rutas: Router -> Controller -> Model -> vista Pug.
 */
const router = express.Router();

router.get("/", renderHome);
router.get("/login", renderLogin);

// Página de gestión: los datos los pide el navegador con fetch() a /api/organizations.
router.get("/organizations", renderOrganizations);
router.get("/organizations/:id", validateId, renderOrganization);
// Página de gestión: los datos los pide el navegador con fetch() a /api/campaigns.
router.get("/campaigns", renderCampaigns);
router.get("/campaigns/:id", validateId, renderCampaign);

// Página de gestión: los datos los pide el navegador con fetch() a /api/users.
router.get("/users", renderUsers);

export default router;
