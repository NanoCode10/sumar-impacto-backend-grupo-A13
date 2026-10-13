import express from "express";

// import Middlewares
import validateId from "../middlewares/validateId.js";
import { requireRole, ROLES_GESTION } from "../middlewares/auth.js";
import { validateOrganization } from "../middlewares/validateBody.js";
import { validateOrganizationQuery } from "../middlewares/validateQuery.js";

// import Controllers
import {
  getOrganizations,
  getOrganizationCampaigns,
  getOrganizationById,
  createOrganization,
  updateOrganization,
  deleteOrganization
} from "../controllers/organizationsController.js";

// Create a new router instance
const router = express.Router();

// Rutas de la API del recurso, montadas en /api/organizations (ver index.js)
router.get("/", validateOrganizationQuery, getOrganizations);
// Consultas públicas; altas, ediciones y bajas sólo superadmin o administrador.
const gestion = requireRole(...ROLES_GESTION);

router.post("/", gestion, validateOrganization("create"), createOrganization);
router.get("/:id", validateId, getOrganizationById);
router.get("/:id/campaigns", validateId, getOrganizationCampaigns);
router.put("/:id", gestion, validateId, validateOrganization("update"), updateOrganization);
router.delete("/:id", gestion, validateId, deleteOrganization);

// Exporta el router para que pueda ser utilizado en otros archivos, como index.js
export default router;
