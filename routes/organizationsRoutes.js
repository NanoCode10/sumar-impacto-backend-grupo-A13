import express from "express";

// Middlewares
import validateId from "../middlewares/validateId.js";
import { validateOrganization } from "../middlewares/validateBody.js";
import { validateOrganizationQuery } from "../middlewares/validateQuery.js";
import { hasRole } from "../middlewares/auth.js";

// Controllers
import {
  getOrganizations,
  getOrganizationCampaigns,
  getOrganizationById,
  createOrganization,
  updateOrganization,
  deleteOrganization
} from "../controllers/organizationsController.js";

const router = express.Router();

// Consultas públicas (lectura de organizaciones y sus campañas)
router.get("/", validateOrganizationQuery, getOrganizations);
router.get("/:id", validateId, getOrganizationById);
router.get("/:id/campaigns", validateId, getOrganizationCampaigns);

// Operaciones de gestión protegidas: sólo superadmin y administrador (Entrega 3)
router.post("/", hasRole("superadmin", "administrador"), validateOrganization("create"), createOrganization);
router.put("/:id", validateId, hasRole("superadmin", "administrador"), validateOrganization("update"), updateOrganization);
router.delete("/:id", validateId, hasRole("superadmin", "administrador"), deleteOrganization);

export default router;
