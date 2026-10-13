import express from "express";

import { validateLogin } from "../middlewares/validateBody.js";
import { login, logout, me } from "../controllers/authController.js";

const router = express.Router();

// Autenticación, montada en /api/auth (ver index.js). Separada de /api/users:
// el login no es una operación sobre la colección de usuarios.
router.post("/login", validateLogin, login);
router.post("/logout", logout);
router.get("/me", me);

export default router;
