import express from "express";

import { validateLogin } from "../middlewares/validateBody.js";
import { login, logout, me } from "../controllers/authController.js";

const router = express.Router();

// Autenticación y sesión, montadas en /api/auth (ver index.js)
router.post("/login", validateLogin, login);
router.post("/logout", logout);
router.get("/me", me);

export default router;
