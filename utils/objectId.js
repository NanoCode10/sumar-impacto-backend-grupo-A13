/**
 * Indica si un valor es un ObjectId de MongoDB escrito como texto: exactamente
 * 24 caracteres hexadecimales ("64b7f0c2a1b2c3d4e5f60718").
 *
 * No se usa mongoose.Types.ObjectId.isValid porque también acepta cualquier
 * texto de 12 caracteres ("abcdefghijkl"), que no es un id real.
 *
 * Lo usan validateId (el :id de la URL), validateBody y validateQuery (organizationId).
 */
const OBJECT_ID = /^[0-9a-fA-F]{24}$/;

const esObjectId = (valor) => typeof valor === "string" && OBJECT_ID.test(valor);

export default esObjectId;
