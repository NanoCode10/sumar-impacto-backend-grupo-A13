import express from "express";

import validateId from "../middlewares/validateId.js";
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
router.post("/", validateCampaign("create"), createCampaign);
router.get("/:id", validateId, getCampaignById);
router.put("/:id", validateId, validateCampaign("update"), updateCampaign);
router.delete("/:id", validateId, deleteCampaign);

export default router;
