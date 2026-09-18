const fs = require("fs");
const path = require("path");

const norm = require("../utils/norm");

const dataPath = path.join(__dirname, "..", "data", "campaigns.json");

/**
 * RESPONSABILIDAD DE LA CLASE
 * Campaign es el Model del dominio "campaña". Se encarga de:
 *  - representar una campaña en memoria (constructor);
 *  - leer y escribir la persistencia en data/campaigns.json;
 *  - ofrecer métodos estáticos de acceso a datos (findById, findAll, create, update, delete);
 *  - garantizar que toda campaña pertenezca a una Organization existente y aprobada.
 * La capa de rutas/controllers NO debe leer el JSON directamente: siempre pasa por este Model.
 *
 * ATRIBUTOS DE UNA INSTANCIA
 *  - id             {number}  Identificador único. Lo genera el servidor, nunca el cliente.
 *  - organizationId {number}  Id de la Organization dueña de la campaña. Debe existir y estar aprobada.
 *  - title          {string}  Título de la campaña.
 *  - description    {string}  Descripción de la campaña.
 *  - targetAmount   {number}  Monto objetivo a recaudar.
 *  - status         {string}  Estado de la campaña (ver Campaign.STATUSES).
 *
 * ESTADO DE LOS MÉTODOS
 *  - constructor -> IMPLEMENTADO.
 *  - findById    -> IMPLEMENTADO.
 *  - findAll     -> IMPLEMENTADO.
 *  - create      -> IMPLEMENTADO (valida que la Organization exista y esté aprobada).
 *  - update      -> IMPLEMENTADO (misma validación, si se envía organizationId).
 *  - delete      -> IMPLEMENTADO (eliminación física, igual que Organization.delete).
 */
class Campaign {
  /** Valores permitidos del estado de una campaña. Ver models/Organization.js. */
  static STATUSES = ["borrador", "activa", "suspendida", "cerrada"];

  constructor(id, organizationId, title, description, targetAmount, status) {
    this.id = id;
    this.organizationId = organizationId;
    this.title = title;
    this.description = description;
    this.targetAmount = targetAmount;
    this.status = status;
  }

  /**
   * Busca una campaña por su id y la devuelve como instancia de Campaign, o null.
   * @param {number} id
   * @returns {Campaign|null}
   */
  static findById(id) {
    const rawData = fs.readFileSync(dataPath, "utf-8");
    const campaigns = JSON.parse(rawData);

    const found = campaigns.find((camp) => camp.id === id);

    if (!found) {
      return null;
    }

    return new Campaign(
      found.id,
      found.organizationId,
      found.title,
      found.description,
      found.targetAmount,
      found.status
    );
  }

  /**
   * Devuelve las campañas como array de instancias de Campaign.
   * Sin filtros, todas. Con filtros, sólo las que coinciden. Ver el comentario
   * de Organization.findAll sobre por qué el filtrado vive en el modelo.
   *
   * @param {{organizationId?: number, status?: string}} filtros
   * @returns {Campaign[]}
   */
  static findAll(filtros = {}) {
    const rawData = fs.readFileSync(dataPath, "utf-8");
    let campaigns = JSON.parse(rawData);

    if (filtros.organizationId !== undefined) {
      const organizationId = Number(filtros.organizationId);
      campaigns = campaigns.filter((camp) => camp.organizationId === organizationId);
    }

    if (filtros.status !== undefined) {
      campaigns = campaigns.filter((camp) => norm(camp.status) === norm(filtros.status));
    }

    return campaigns.map(
      (camp) =>
        new Campaign(
          camp.id,
          camp.organizationId,
          camp.title,
          camp.description,
          camp.targetAmount,
          camp.status
        )
    );
  }

  /**
   * Crea una nueva campaña, la persiste y devuelve el recurso creado.
   * Lanza un error con statusCode 404 si la Organization no existe, o 409 si no está aprobada.
   * @param {{organizationId: number, title: string, description: string, targetAmount: number, status: string}} data
   * @returns {Campaign}
   */
  static create(data) {
    // Validar que la organización referenciada exista (importación diferida para evitar
    // dependencia circular en el momento de la carga del módulo).
    const Organization = require("./Organization");
    const org = Organization.findById(Number(data.organizationId));
    if (!org) {
      const err = new Error("La organización indicada no existe");
      err.statusCode = 404;
      throw err;
    }

    // Regla de negocio: sólo una organización aprobada puede recibir campañas.
    if (org.status !== Organization.APPROVED) {
      const err = new Error(
        `La organización ${org.id} está en estado ${org.status} y no puede recibir campañas`
      );
      err.statusCode = 409;
      throw err;
    }

    const rawData = fs.readFileSync(dataPath, "utf-8");
    const campaigns = JSON.parse(rawData);

    // El servidor genera el id: máximo id existente + 1 (o 1 si no hay campañas).
    const maxId = campaigns.reduce((max, c) => (c.id > max ? c.id : max), 0);
    const newId = maxId + 1;

    const newCampaign = new Campaign(
      newId,
      Number(data.organizationId),
      data.title,
      data.description,
      Number(data.targetAmount),
      data.status || "borrador"
    );

    campaigns.push(newCampaign);
    fs.writeFileSync(dataPath, JSON.stringify(campaigns, null, 2), "utf-8");

    return newCampaign;
  }

  /**
   * Actualiza los campos permitidos de una campaña existente.
   * @param {number} id
   * @param {{organizationId?: number, title?: string, description?: string, targetAmount?: number, status?: string}} data
   * @returns {Campaign|null} la campaña actualizada, o null si no existe.
   */
  static update(id, data) {
    const rawData = fs.readFileSync(dataPath, "utf-8");
    const campaigns = JSON.parse(rawData);

    const index = campaigns.findIndex((c) => c.id === id);
    if (index === -1) {
      return null;
    }

    // Si se quiere cambiar organizationId, validar que la nueva organización exista.
    if (data.organizationId !== undefined) {
      const Organization = require("./Organization");
      const org = Organization.findById(Number(data.organizationId));
      if (!org) {
        const err = new Error("La organización indicada no existe");
        err.statusCode = 404;
        throw err;
      }
      // Misma regla que en create: si no, se podría mover una campaña a una
      // organización no aprobada y esquivar el control.
      if (org.status !== Organization.APPROVED) {
        const err = new Error(
          `La organización ${org.id} está en estado ${org.status} y no puede recibir campañas`
        );
        err.statusCode = 409;
        throw err;
      }
      campaigns[index].organizationId = Number(data.organizationId);
    }

    // Actualizar solo los campos permitidos; el id nunca cambia.
    if (data.title !== undefined) campaigns[index].title = data.title;
    if (data.description !== undefined) campaigns[index].description = data.description;
    if (data.targetAmount !== undefined) campaigns[index].targetAmount = Number(data.targetAmount);
    if (data.status !== undefined) campaigns[index].status = data.status;

    fs.writeFileSync(dataPath, JSON.stringify(campaigns, null, 2), "utf-8");

    const updated = campaigns[index];
    return new Campaign(
      updated.id,
      updated.organizationId,
      updated.title,
      updated.description,
      updated.targetAmount,
      updated.status
    );
  }

  /**
   * Elimina físicamente una campaña del JSON.
   * Estrategia: eliminación física (igual que Organization.delete).
   * @param {number} id
   * @returns {Campaign|null} la campaña eliminada, o null si no existía.
   */
  static delete(id) {
    const rawData = fs.readFileSync(dataPath, "utf-8");
    const campaigns = JSON.parse(rawData);

    const index = campaigns.findIndex((c) => c.id === id);
    if (index === -1) {
      return null;
    }

    const [deleted] = campaigns.splice(index, 1);
    fs.writeFileSync(dataPath, JSON.stringify(campaigns, null, 2), "utf-8");

    return new Campaign(
      deleted.id,
      deleted.organizationId,
      deleted.title,
      deleted.description,
      deleted.targetAmount,
      deleted.status
    );
  }
}

module.exports = Campaign;
