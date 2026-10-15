import express from "express";

import validateId from "../middlewares/validateId.js";
import { validateUser } from "../middlewares/validateBody.js";
import { validateUserQuery } from "../middlewares/validateQuery.js";

import { getUsers, getUserById, createUser, updateUser, deleteUser } from "../controllers/usersController.js";

const router = express.Router();

// Rutas de la API del recurso, montadas en /api/users (ver index.js).
// Sin sesión no hay control de quién las usa: queda para la entrega 3.

router.get("/", validateUserQuery, getUsers);
router.post("/", validateUser("create"), createUser);
router.get("/:id", validateId, getUserById);
router.put("/:id", validateId, validateUser("update"), updateUser);
router.delete("/:id", validateId, deleteUser);

export default router;
