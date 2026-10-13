/**
 * FUNCIONES COMPARTIDAS DEL FRONTEND (corren en el navegador, no en Node)
 * Las usan public/js/organizations.js y public/js/campaigns.js. Cada vista Pug
 * carga este archivo con un <script> ANTES del script de su página: como son
 * scripts clásicos (no módulos), las funciones declaradas acá quedan disponibles
 * para el script que se carga después.
 *
 * Acá sólo hay funciones: nada de variables globales, para no chocar con las
 * constantes que declara cada página.
 */

/**
 * Hace la petición a la API y devuelve el JSON de la respuesta. Si el status no
 * es 2xx lanza un Error con el mensaje { error } que mandó la API (400, 404, 409).
 */
async function pedir(url, opciones = {}) {
  const res = await fetch(url, {
    ...opciones,
    headers: { "Content-Type": "application/json" }
  });
  const datos = await res.json();

  if (!res.ok) {
    throw new Error(datos.error || `Error ${res.status}`);
  }
  return datos;
}

/**
 * URL de un recurso puntual. El id se trata como un valor opaco: hoy es un
 * número y con MongoDB será un ObjectId (texto); en los dos casos sirve igual.
 */
function urlRecurso(base, id) {
  return `${base}/${encodeURIComponent(id)}`;
}

/** Muestra un mensaje en el elemento #mensaje de la página. tipo: "ok" o "error". */
function mostrarMensaje(texto, tipo) {
  const mensaje = document.getElementById("mensaje");
  mensaje.textContent = texto;
  mensaje.className = tipo;
}

// Las celdas usan textContent y no innerHTML: los datos los cargan usuarios y
// no deben interpretarse como HTML.
function celda(texto) {
  const td = document.createElement("td");
  td.textContent = texto;
  return td;
}

function celdaEnlace(texto, href) {
  const td = document.createElement("td");
  const enlace = document.createElement("a");
  enlace.href = href;
  enlace.textContent = texto;
  td.appendChild(enlace);
  return td;
}

function celdaBadge(texto) {
  const td = document.createElement("td");
  const badge = document.createElement("span");
  badge.className = "badge";
  badge.textContent = texto;
  td.appendChild(badge);
  return td;
}

function boton(texto, alHacerClic) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.textContent = texto;
  btn.addEventListener("click", alHacerClic);
  return btn;
}

/** Celda con los botones Editar y Eliminar de una fila. */
function celdaAcciones(alEditar, alEliminar) {
  const td = document.createElement("td");
  td.appendChild(boton("Editar", alEditar));
  td.appendChild(boton("Eliminar", alEliminar));
  return td;
}

/** Deja en la tabla una sola fila con un texto (por ejemplo, "Sin campañas"). */
function filaUnica(tbody, texto, columnas) {
  const tr = document.createElement("tr");
  const td = celda(texto);
  td.colSpan = columnas;
  tr.appendChild(td);
  tbody.replaceChildren(tr);
}
