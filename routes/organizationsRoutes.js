const express = require("express");

const validateId = require("../middlewares/validateId");
const {
  getOrganizationById,
  getOrganizations,
  createOrganization,
  updateOrganization,
  deleteOrganization,
} = require("../controllers/organizationsController");

const router = express.Router();

router.get("/", getOrganizations);
router.post("/", createOrganization);
router.get("/:id", validateId, getOrganizationById);
router.put("/:id", validateId, updateOrganization);
router.delete("/:id", validateId, deleteOrganization);

module.exports = router;
