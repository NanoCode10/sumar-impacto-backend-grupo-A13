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
 * Es pública: sin sesión muestra sólo lo que interesa a un donante, las
 * organizaciones aprobadas y las campañas activas de esas organizaciones.
 * Con sesión, todos los estados.
 */
async function renderHome(req, res, next) {
  try {
    const publica = !req.session.user;

    const organizations = await Organization.buscarTodas(publica ? { status: Organization.APPROVED } : {});
    // Igual que el detalle de campaña: la página muestra el nombre de la organización.
    let campaigns = await Campaign.buscarTodas(publica ? { status: "activa" } : {}).populate(
      "organizationId",
      "name status"
    );
    if (publica) {
      campaigns = campaigns.filter((c) => c.organizationId?.status === Organization.APPROVED);
    }

    res.render("home", { title: "SumarImpacto", organizations, campaigns });
  } catch (err) {
    next(err);
  }
}

/**
 * Destino seguro después del login: sólo direcciones de este mismo sitio. Un
 * "volver" que empiece con "//" o con un dominio llevaría a otro sitio
 * (redirección abierta), así que en ese caso se vuelve al inicio.
 */
function destinoSeguro(volver) {
  // "/\" también: algunos navegadores lo interpretan como "//".
  const esLocal =
    typeof volver === "string" &&
    volver.startsWith("/") &&
    !volver.startsWith("//") &&
    !volver.startsWith("/\\");
  return esLocal ? volver : "/";
}

/**
 * GET /login  -> formulario de ingreso. Si ya hay sesión, va directo al destino.
 */
function renderLogin(req, res) {
  const volver = destinoSeguro(req.query.volver);
  if (req.session.user) {
    return res.redirect(volver);
  }
  res.render("login", { title: "Ingresar - SumarImpacto", volver });
}

export { renderHome, renderLogin };
