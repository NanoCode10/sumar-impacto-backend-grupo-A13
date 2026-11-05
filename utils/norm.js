/**
 * Normaliza un texto para poder compararlo sin que las tildes, las mayúsculas
 * o los espacios de más cambien el resultado.
 *
 * "Fundación", "fundacion" y " FUNDACION " dan todas "fundacion".
 *
 * normalize("NFD") separa cada letra de su tilde, y el replace borra esas tildes
 * sueltas: hace falta porque la misma palabra escrita en dos teclados distintos
 * puede tener dos codificaciones diferentes, y entonces === da false.
 *
 * Se usa SIEMPRE de los dos lados de la comparación.
 */
const norm = (value) =>
  String(value ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();

export default norm;
