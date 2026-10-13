import express from "express";

import validateId from "../middlewares/validateId.js";
import { requireRole, ROLES_GESTION } from "../middlewares/auth.js";
import { validateCampaign } from "../middlewares/validateBody.js";
import { validateCampaignQuery } from "../middlewares/validateQuery.js";

import {
  getCampaigns,
  getCampaignById,
  createCampaign,
  updateCampaign,
  deleteCampaign
} from "../controllers/campaignsController.js";

const router = express.Router();

// Rutas de la API del recurso, montadas en /api/campaigns (ver index.js)
router.get("/", validateCampaignQuery, getCampaigns);
// Consultas públicas; altas, ediciones y bajas sólo superadmin o administrador.
const gestion = requireRole(...ROLES_GESTION);

router.post("/", gestion, validateCampaign("create"), createCampaign);
router.get("/:id", validateId, getCampaignById);
router.put("/:id", gestion, validateId, validateCampaign("update"), updateCampaign);
router.delete("/:id", gestion, validateId, deleteCampaign);

export default router;
