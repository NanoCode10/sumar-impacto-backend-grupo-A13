import express from "express";

import validateId from "../middlewares/validateId.js";
import { validateCampaign } from "../middlewares/validateBody.js";
import { validateCampaignQuery } from "../middlewares/validateQuery.js";
import { hasRole } from "../middlewares/auth.js";

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

// Operaciones protegidas (Entrega 3)
router.post("/", hasRole("superadmin", "administrador", "organizacion"), validateCampaign("create"), createCampaign);
router.put("/:id", validateId, hasRole("superadmin", "administrador", "organizacion"), validateCampaign("update"), updateCampaign);
router.delete("/:id", validateId, hasRole("superadmin", "administrador"), deleteCampaign);

export default router;
