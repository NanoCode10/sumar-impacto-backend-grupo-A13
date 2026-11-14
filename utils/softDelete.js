/**
 * PLUGIN DE BORRADO LÓGICO (Mongoose)
 * Se aplica a un schema con schema.plugin(softDelete). Agrega:
 *  - el campo deletedAt: null mientras el documento está vigente; la fecha en que
 *    se eliminó, después. El estado de negocio (status) no se toca al eliminar.
 *  - un filtro automático: toda consulta agrega deletedAt: null, así que para la
 *    aplicación lo eliminado no existe. Los listados no lo traen y GET, PUT o
 *    DELETE sobre algo eliminado dan 404.
 *
 * Qué cubre:
 *  - /^find/: find, findOne, findById, exists, populate y los findOneAnd...
 *  - las otras lecturas y actualizaciones, por nombre;
 *  - aggregate, que no es una consulta común: el filtro va como primera etapa.
 * Qué queda afuera a propósito:
 *  - deleteOne y deleteMany: son borrado físico (los usan los tests para vaciar
 *    la base de prueba);
 *  - estimatedDocumentCount: no admite filtros. Para contar, usar countDocuments.
 *
 * Los documentos guardados antes de existir el campo no lo tienen; la condición
 * deletedAt: null también los encuentra, así que no hace falta migrarlos.
 */
function soloVigentes() {
  this.where({ deletedAt: null });
}

export default function softDelete(schema) {
  schema.add({
    deletedAt: { type: Date, default: null }
  });

  schema.pre(/^find/, soloVigentes);
  schema.pre(["countDocuments", "updateOne", "updateMany", "distinct"], soloVigentes);
  schema.pre("aggregate", function () {
    this.pipeline().unshift({ $match: { deletedAt: null } });
  });
}
