import express from "express";
import validateId from "../middlewares/validateId.js";
import { validateDonation } from "../middlewares/validateBody.js";
import { validateDonationQuery } from "../middlewares/validateQuery.js";
import { hasRole } from "../middlewares/auth.js";
import {
  getDonations,
  getDonationById,
  createDonation,
  updateDonation,
  deleteDonation
} from "../controllers/donationsController.js";

const router = express.Router();

// Consultas: cualquier usuario con sesión (la exige apiRoutes.js), porque hay datos personales.
router.get("/", validateDonationQuery, getDonations);
router.get("/:id", validateId, getDonationById);

// Gestión: sólo superadmin y administrador
router.post("/", hasRole("superadmin", "administrador"), validateDonation("create"), createDonation);
router.put("/:id", validateId, hasRole("superadmin", "administrador"), validateDonation("update"), updateDonation);
router.delete("/:id", validateId, hasRole("superadmin", "administrador"), deleteDonation);

export default router;
