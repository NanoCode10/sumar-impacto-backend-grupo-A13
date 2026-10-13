import express from "express";

import validateId from "../middlewares/validateId.js";
import { requireRole, ROLES_GESTION } from "../middlewares/auth.js";
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

// Las páginas de gestión piden sesión con rol superadmin o administrador; las
// de consulta (inicio y detalles) son públicas.

// Página de gestión: los datos los pide el navegador con fetch() a /api/organizations.
router.get("/organizations", requireRole(...ROLES_GESTION), renderOrganizations);
router.get("/organizations/:id", validateId, renderOrganization);
// Página de gestión: los datos los pide el navegador con fetch() a /api/campaigns.
router.get("/campaigns", requireRole(...ROLES_GESTION), renderCampaigns);
router.get("/campaigns/:id", validateId, renderCampaign);

// Gestión de usuarios: sólo superadmin.
router.get("/users", requireRole("superadmin"), renderUsers);

export default router;
