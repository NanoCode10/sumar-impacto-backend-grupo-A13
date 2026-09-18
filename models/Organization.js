const fs = require("fs");
const path = require("path");

const norm = require("../utils/norm");

const dataPath = path.join(__dirname, "..", "data", "organizations.json");

/**
 * RESPONSABILIDAD DE LA CLASE
 * Organization es el Model del dominio "organización". Se encarga de:
 *  - representar una organización en memoria (constructor);
 *  - leer y escribir la persistencia en data/organizations.json;
 *  - ofrecer métodos estáticos de acceso a datos (findById, findAll, create, update, delete).
 * La capa de rutas/controllers NO debe leer el JSON directamente: siempre pasa por este Model.
 *
 * ATRIBUTOS DE UNA INSTANCIA
 *  - id     {number}  Identificador único. Lo genera el servidor, nunca el cliente.
 *  - name   {string}  Nombre de la organización.
 *  - type   {string}  Tipo/categoría de la organización (ver Organization.TYPES).
 *  - email  {string}  Email de contacto.
 *  - status {string}  Estado de la organización (ver Organization.STATUSES).
 *
 * ESTADO DE LOS MÉTODOS
 *  - constructor  -> IMPLEMENTADO y funcionando.
 *  - findById     -> IMPLEMENTADO y funcionando (solo lectura).
 *  - findAll      -> IMPLEMENTADO y funcionando.
 *  - create       -> IMPLEMENTADO y funcionando.
 *  - update       -> IMPLEMENTADO y funcionando.
 *  - delete       -> IMPLEMENTADO y funcionando.
 */
class Organization {
  /**
   * Valores permitidos del dominio. Se escriben acá una sola vez y el resto del
   * código los referencia (middlewares/validateBody.js y validateQuery.js), para que no convivan dos
   * grafías del mismo valor.
   */
  static TYPES = ["ONG", "fundación", "comedor"];
  static STATUSES = ["pendiente", "aprobada", "suspendida", "baja"];

  /** Único estado que habilita a tener campañas. Se referencia desde Campaign. */
  static APPROVED = "aprobada";

  constructor(id, name, type, email, status) {
    this.id = id;
    this.name = name;
    this.type = type;
    this.email = email;
    this.status = status;
  }

  static findById(id) {
    const rawData = fs.readFileSync(dataPath, "utf-8");
    const organizations = JSON.parse(rawData);

    const found = organizations.find((org) => org.id === id);

    if (!found) {
      return null;
    }

    return new Organization(found.id, found.name, found.type, found.email, found.status);
  }

  /**
   * Devuelve las organizaciones como array de instancias de Organization.
   * Sin filtros, todas. Con filtros, sólo las que coinciden.
   *
   * El filtrado vive acá, en la capa de datos, y no en el controller: cuando los
   * datos salgan de MongoDB esto se convierte en una query que resuelve la base,
   * y el cambio queda contenido en este archivo.
   *
   * @param {{type?: string, status?: string}} filtros
   */
  static findAll(filtros = {}) {
    const rawData = fs.readFileSync(dataPath, "utf-8");
    let organizations = JSON.parse(rawData);

    // norm() de los dos lados: "?type=fundacion" encuentra "fundación".
    if (filtros.type !== undefined) {
      organizations = organizations.filter((org) => norm(org.type) === norm(filtros.type));
    }

    if (filtros.status !== undefined) {
      organizations = organizations.filter((org) => norm(org.status) === norm(filtros.status));
    }

    return organizations.map(
      (org) => new Organization(org.id, org.name, org.type, org.email, org.status)
    );
  }

  /**
   * Crea una nueva organización, la persiste y devuelve el recurso creado.
   * @param {{name: string, type: string, email: string, status: string}} data
   */
  static create(data) {
    const rawData = fs.readFileSync(dataPath, "utf-8");
    const organizations = JSON.parse(rawData);

    const maxId = organizations.reduce((max, org) => (org.id > max ? org.id : max), 0);
    const newId = maxId + 1;

    const newOrg = new Organization(
      newId,
      data.name,
      data.type,
      data.email,
      data.status || "pendiente"
    );

    organizations.push(newOrg);
    fs.writeFileSync(dataPath, JSON.stringify(organizations, null, 2), "utf-8");

    return newOrg;
  }

  /**
   * Actualiza los campos permitidos de una organización existente.
   * @param {number} id
   * @param {{name?: string, type?: string, email?: string, status?: string}} data
   * @returns {Organization|null} la organización actualizada, o null si no existe.
   */
  static update(id, data) {
    const rawData = fs.readFileSync(dataPath, "utf-8");
    const organizations = JSON.parse(rawData);

    const index = organizations.findIndex((org) => org.id === id);
    if (index === -1) {
      return null;
    }

    if (data.name !== undefined) organizations[index].name = data.name;
    if (data.type !== undefined) organizations[index].type = data.type;
    if (data.email !== undefined) organizations[index].email = data.email;
    if (data.status !== undefined) organizations[index].status = data.status;

    fs.writeFileSync(dataPath, JSON.stringify(organizations, null, 2), "utf-8");

    const updated = organizations[index];
    return new Organization(updated.id, updated.name, updated.type, updated.email, updated.status);
  }

  /**
   * Elimina una organización.
   * Lanza un error con statusCode 409 si la organización tiene campañas asociadas.
   * @param {number} id
   */
  static delete(id) {
    const rawData = fs.readFileSync(dataPath, "utf-8");
    const organizations = JSON.parse(rawData);

    const index = organizations.findIndex((org) => org.id === id);
    if (index === -1) {
      return null;
    }

    // Regla de negocio: una organización con campañas no se elimina, porque esas
    // campañas quedarían apuntando a un id que ya no existe. Import diferido,
    // igual que en Campaign, para no crear un ciclo entre los dos modelos.
    const Campaign = require("./Campaign");
    const campanias = Campaign.findAll().filter((campania) => campania.organizationId === id);
    if (campanias.length > 0) {
      const err = new Error(
        `La organización ${id} tiene ${campanias.length} campaña(s) y no puede eliminarse`
      );
      err.statusCode = 409;
      throw err;
    }

    const [deletedOrg] = organizations.splice(index, 1);
    fs.writeFileSync(dataPath, JSON.stringify(organizations, null, 2), "utf-8");

    return new Organization(deletedOrg.id, deletedOrg.name, deletedOrg.type, deletedOrg.email, deletedOrg.status);
  }
}

module.exports = Organization;
