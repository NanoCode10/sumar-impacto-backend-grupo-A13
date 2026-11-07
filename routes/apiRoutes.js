import express from "express";

import { requireLoginSalvoPublicas } from "../middlewares/auth.js";

import organizationsRoutes from "./organizationsRoutes.js";
import campaignsRoutes from "./campaignsRoutes.js";
import usersRoutes from "./usersRoutes.js";
import authRoutes from "./authRoutes.js";
import donorsRoutes from "./donorsRoutes.js";
import donationsRoutes from "./donationsRoutes.js";

/**
 * API REST, montada en /api (ver index.js). Responde siempre JSON.
 * El control de sesión va primero y alcanza a todos los recursos de abajo:
 * cualquier recurso que se agregue a RECURSOS queda protegido por defecto,
 * y tests/apiPermisos.test.js lo recorre para comprobarlo.
 */
export const RECURSOS = {
  "/organizations": organizationsRoutes,
  "/campaigns": campaignsRoutes,
  "/users": usersRoutes,
  "/auth": authRoutes,
  "/donors": donorsRoutes,
  "/donations": donationsRoutes
};

const router = express.Router();

router.use(requireLoginSalvoPublicas);

for (const [ruta, recurso] of Object.entries(RECURSOS)) {
  router.use(ruta, recurso);
}

export default router;
