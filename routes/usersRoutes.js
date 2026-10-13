import express from "express";

import { validateUser } from "../middlewares/validateBody.js";
import { createUser } from "../controllers/usersController.js";

const router = express.Router();

// Rutas de la API del recurso, montadas en /api/users (ver index.js)
router.post("/", validateUser("create"), createUser);

export default router;
