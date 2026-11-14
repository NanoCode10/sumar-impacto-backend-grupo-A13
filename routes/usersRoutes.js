import express from "express";

import validateId from "../middlewares/validateId.js";
import { validateUser } from "../middlewares/validateBody.js";
import { validateUserQuery } from "../middlewares/validateQuery.js";
import { hasRole } from "../middlewares/auth.js";

import { getUsers, getUserById, createUser, updateUser, deleteUser } from "../controllers/usersController.js";

const router = express.Router();

// Rutas de la API de usuarios: protegidas exclusivamente para superadmin (Entrega 3)
router.use(hasRole("superadmin"));

router.get("/", validateUserQuery, getUsers);
router.post("/", validateUser("create"), createUser);
router.get("/:id", validateId, getUserById);
router.put("/:id", validateId, validateUser("update"), updateUser);
router.delete("/:id", validateId, deleteUser);

export default router;
