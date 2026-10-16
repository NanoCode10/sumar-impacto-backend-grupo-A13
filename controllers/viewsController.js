import Organization from "../models/Organization.js";
import Campaign from "../models/Campaign.js";

/**
 * RESPONSABILIDAD DE ESTE CONTROLLER
 * Páginas HTML que no pertenecen a un único recurso. La Home muestra
 * organizaciones y campañas a la vez, por eso no vive en organizationsController
 * ni en campaignsController.
 *
 * Igual que los demás controllers: pide los datos al Model y se los pasa a la
 * vista. El Router sólo define la ruta y delega acá.
 */

/**
 * GET /  -> página de inicio con el listado de organizaciones y campañas.
 */
async function renderHome(req, res, next) {
  try {
    const organizations = await Organization.buscarTodas();
    // Igual que el detalle de campaña: la página muestra el nombre de la organización.
    const campaigns = await Campaign.buscarTodas().populate("organizationId", "name");

    res.render("home", { title: "SumarImpacto", organizations, campaigns });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /login  -> formulario de ingreso. Verifica usuario y contraseña contra la
 * API (public/js/login.js) y muestra el resultado; no crea sesión.
 */
function renderLogin(req, res) {
  res.render("login", { title: "Ingresar - SumarImpacto" });
}

export { renderHome, renderLogin };
