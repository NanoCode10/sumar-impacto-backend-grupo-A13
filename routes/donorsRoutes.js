import express from "express";
import validateId from "../middlewares/validateId.js";
import { validateDonor } from "../middlewares/validateBody.js";
import { validateDonorQuery } from "../middlewares/validateQuery.js";
import {
  getDonors,
  getDonorById,
  createDonor,
  updateDonor,
  deleteDonor
} from "../controllers/donorsController.js";

const router = express.Router();

router.get("/", validateDonorQuery, getDonors);
router.post("/", validateDonor("create"), createDonor);
router.get("/:id", validateId, getDonorById);
router.put("/:id", validateId, validateDonor("update"), updateDonor);
router.delete("/:id", validateId, deleteDonor);

export default router;
