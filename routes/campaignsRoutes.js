import express from "express";

import validateId from "../middlewares/validateId.js";
import { validateCampaign } from "../middlewares/validateBody.js";
import { validateCampaignQuery } from "../middlewares/validateQuery.js";
import { hasRole } from "../middlewares/auth.js";
import { restringirAOrganizacionPropia } from "../middlewares/propiedad.js";

import {
  getCampaigns,
  getCampaignById,
  createCampaign,
  updateCampaign,
  deleteCampaign
} from "../controllers/campaignsController.js";

const router = express.Router();

// Consultas públicas (lectura de campañas)
router.get("/", validateCampaignQuery, getCampaigns);
router.get("/:id", validateId, getCampaignById);

// Gestión: superadmin y administrador sobre todas; el referente (organizacion), sólo sobre
// las de su organización (restringirAOrganizacionPropia). Borrar, sólo la administración.
const GESTIONAN_CAMPANIAS = ["superadmin", "administrador", "organizacion"];

router.post(
  "/",
  hasRole(GESTIONAN_CAMPANIAS),
  restringirAOrganizacionPropia,
  validateCampaign("create"),
  createCampaign
);
router.put(
  "/:id",
  validateId,
  hasRole(GESTIONAN_CAMPANIAS),
  restringirAOrganizacionPropia,
  validateCampaign("update"),
  updateCampaign
);
router.delete("/:id", validateId, hasRole("superadmin", "administrador"), deleteCampaign);

export default router;
