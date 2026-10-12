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
function renderHome(req, res) {
  const organizations = Organization.findAll();
  const campaigns = Campaign.findAll();
  res.render("home", { title: "SumarImpacto", organizations, campaigns });
}

export { renderHome };
