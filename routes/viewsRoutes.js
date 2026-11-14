import express from "express";

import validateId from "../middlewares/validateId.js";
import { requireAuthView } from "../middlewares/auth.js";
import { renderHome, renderLogin, renderChat } from "../controllers/viewsController.js";
import { renderOrganization, renderOrganizations } from "../controllers/organizationsController.js";
import { renderCampaign, renderCampaigns } from "../controllers/campaignsController.js";
import { renderUsers } from "../controllers/usersController.js";
import { renderDonors } from "../controllers/donorsController.js";
import { renderDonations } from "../controllers/donationsController.js";

/**
 * Páginas HTML generadas con Pug. Son las únicas rutas que usan res.render;
 * la API vive bajo /api y siempre responde JSON.
 */
const router = express.Router();

router.get("/", renderHome);
router.get("/login", renderLogin);

// Chat interno: sólo con sesión (la conexión de Socket.IO también la exige)
router.get("/chat", requireAuthView, renderChat);

// Públicas (sólo lectura): el inicio y las fichas de cada organización y campaña.
router.get("/organizations/:id", validateId, renderOrganization);
router.get("/campaigns/:id", validateId, renderCampaign);

// Páginas de gestión: con sesión. Cada una muestra sólo lo que el rol puede hacer.
router.get("/organizations", requireAuthView, renderOrganizations);
router.get("/campaigns", requireAuthView, renderCampaigns);

// Página de gestión de usuarios: reservada para superadmin autenticado
router.get(
  "/users",
  requireAuthView,
  (req, res, next) => {
    if (req.session.user.role !== "superadmin") {
      const err = new Error("Acceso denegado: sólo superadmin puede gestionar usuarios");
      err.statusCode = 403;
      return next(err);
    }
    next();
  },
  renderUsers
);

// Páginas de gestión de donantes y donaciones: con sesión, porque muestran datos personales
router.get("/donors", requireAuthView, renderDonors);
router.get("/donations", requireAuthView, renderDonations);

export default router;
