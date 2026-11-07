import express from "express";
import validateId from "../middlewares/validateId.js";
import { validateDonor } from "../middlewares/validateBody.js";
import { validateDonorQuery } from "../middlewares/validateQuery.js";
import { hasRole } from "../middlewares/auth.js";
import {
  getDonors,
  getDonorById,
  createDonor,
  updateDonor,
  deleteDonor
} from "../controllers/donorsController.js";

const router = express.Router();

// Consultas: cualquier usuario con sesión (la exige apiRoutes.js), porque hay datos personales.
router.get("/", validateDonorQuery, getDonors);
router.get("/:id", validateId, getDonorById);

// Gestión: sólo superadmin y administrador
router.post("/", hasRole("superadmin", "administrador"), validateDonor("create"), createDonor);
router.put("/:id", validateId, hasRole("superadmin", "administrador"), validateDonor("update"), updateDonor);
router.delete("/:id", validateId, hasRole("superadmin", "administrador"), deleteDonor);

export default router;
