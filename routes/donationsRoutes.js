import express from "express";
import validateId from "../middlewares/validateId.js";
import { validateDonation } from "../middlewares/validateBody.js";
import { validateDonationQuery } from "../middlewares/validateQuery.js";
import {
  getDonations,
  getDonationById,
  createDonation,
  updateDonation,
  deleteDonation
} from "../controllers/donationsController.js";

const router = express.Router();

router.get("/", validateDonationQuery, getDonations);
router.post("/", validateDonation("create"), createDonation);
router.get("/:id", validateId, getDonationById);
router.put("/:id", validateId, validateDonation("update"), updateDonation);
router.delete("/:id", validateId, deleteDonation);

export default router;
