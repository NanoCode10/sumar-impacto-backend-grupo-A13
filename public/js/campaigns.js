/**
 * FRONTEND DE CAMPAÑAS (corre en el navegador, no en Node)
 * Mismo esquema que organizations.js, contra la API de campañas:
 *  - GET    /api/campaigns      -> listar
 *  - POST   /api/campaigns      -> crear
 *  - PUT    /api/campaigns/:id  -> editar
 *  - DELETE /api/campaigns/:id  -> eliminar
 * Además pide GET /api/organizations para armar el <select> de organización y
 * para mostrar en la tabla el nombre de la organización en lugar de su id.
 *
 * El <select> lista TODAS las organizaciones con su estado. La regla "sólo una
 * organización aprobada puede recibir campañas" la decide el backend (409), no
 * este archivo: así hay una sola fuente de verdad para la regla.
 *
 * IDs: se tratan como valores opacos. Un <select> sólo guarda textos, así que el
 * id ORIGINAL de cada organización (como vino de la API) se guarda en un Map y se
 * manda ese mismo valor como organizationId, sin convertirlo con Number(). Hoy es
 * un número; con MongoDB será un ObjectId en texto, y este archivo no cambia.
 * Las funciones pedir, urlRecurso, mostrarMensaje, celda... vienen de comun.js.
 */

const API = "/api/campaigns";
const API_ORGANIZACIONES = "/api/organizations";

const form = document.getElementById("camp-form");
const tbody = document.getElementById("camp-tbody");
const selectOrganizacion = document.getElementById("organizationId");
const tituloForm = document.getElementById("form-titulo");
const btnCancelar = document.getElementById("btn-cancelar");

// Clave: el valor de la <option> (texto). Valor: la organización tal como vino de la API.
const organizacionesPorOpcion = new Map();

// Campaña que se está editando, o null si el formulario está en modo alta.
let campaniaEnEdicion = null;

function nombreOrganizacion(organizationId) {
  const org = organizacionesPorOpcion.get(String(organizationId));
  return org ? org.name : `Organización ${organizationId}`;
}

/** Pide las organizaciones y arma las opciones del <select>. */
async function cargarOrganizaciones() {
  const organizaciones = await pedir(API_ORGANIZACIONES);

  organizacionesPorOpcion.clear();
  const opciones = organizaciones.map((org) => {
    organizacionesPorOpcion.set(String(org.id), org);
    // Se muestra el estado para que se entienda por qué el backend rechaza
    // una organización que no está aprobada.
    return new Option(`${org.name} (${org.status})`, String(org.id));
  });

  selectOrganizacion.replaceChildren(new Option("-- Elegí una organización --", ""), ...opciones);
}

function crearFila(camp) {
  const tr = document.createElement("tr");
  tr.append(
    celdaEnlace(camp.title, urlRecurso("/campaigns", camp.id)),
    celdaEnlace(nombreOrganizacion(camp.organizationId), urlRecurso("/organizations", camp.organizationId)),
    celda(`$${camp.targetAmount}`),
    celdaBadge(camp.status),
    celdaAcciones(() => editar(camp), () => eliminar(camp))
  );
  return tr;
}

/** Pide el listado a la API y vuelve a dibujar la tabla completa. */
async function cargarCampanias() {
  const campanias = await pedir(API);

  if (campanias.length === 0) {
    filaUnica(tbody, "Sin campañas registradas.", 5);
    return;
  }
  tbody.replaceChildren(...campanias.map(crearFila));
}

/** Vuelve el formulario al modo alta. */
function limpiarFormulario() {
  form.reset();
  campaniaEnEdicion = null;
  tituloForm.textContent = "Nueva campaña";
  btnCancelar.hidden = true;
}

/** Carga los datos de la campaña en el formulario para editarla. */
function editar(camp) {
  campaniaEnEdicion = camp;
  form.elements.title.value = camp.title;
  form.elements.description.value = camp.description;
  form.elements.targetAmount.value = camp.targetAmount;
  form.elements.organizationId.value = String(camp.organizationId);
  form.elements.status.value = camp.status;
  tituloForm.textContent = `Editando: ${camp.title}`;
  btnCancelar.hidden = false;
  mostrarMensaje("", "");
  form.elements.title.focus();
}

async function eliminar(camp) {
  if (!confirm(`¿Eliminar la campaña "${camp.title}"?`)) {
    return;
  }

  try {
    await pedir(urlRecurso(API, camp.id), { method: "DELETE" });
    if (campaniaEnEdicion && campaniaEnEdicion.id === camp.id) {
      limpiarFormulario();
    }
    mostrarMensaje(`Campaña "${camp.title}" eliminada.`, "ok");
    await cargarCampanias();
  } catch (err) {
    mostrarMensaje(err.message, "error");
  }
}

form.addEventListener("submit", async (event) => {
  // Sin esto el navegador enviaría el formulario y recargaría la página.
  event.preventDefault();

  const organizacion = organizacionesPorOpcion.get(form.elements.organizationId.value);

  // validateBody espera targetAmount como number: un <input type="number">
  // entrega texto, y valueAsNumber da el número que escribió el usuario.
  const body = {
    title: form.elements.title.value,
    description: form.elements.description.value,
    targetAmount: form.elements.targetAmount.valueAsNumber
  };

  // organizationId se manda con el tipo que trajo la API. En edición sólo se
  // manda si cambió: el backend vuelve a controlar que la organización esté
  // aprobada cada vez que recibe organizationId, y no tiene sentido rechazar un
  // cambio de título porque la organización actual se haya suspendido después.
  if (organizacion && (!campaniaEnEdicion || organizacion.id !== campaniaEnEdicion.organizationId)) {
    body.organizationId = organizacion.id;
  }

  // El estado es opcional, igual que en organizaciones.
  if (form.elements.status.value !== "") {
    body.status = form.elements.status.value;
  }

  try {
    if (campaniaEnEdicion) {
      const actualizada = await pedir(urlRecurso(API, campaniaEnEdicion.id), {
        method: "PUT",
        body: JSON.stringify(body)
      });
      mostrarMensaje(`Campaña "${actualizada.title}" actualizada.`, "ok");
    } else {
      const creada = await pedir(API, { method: "POST", body: JSON.stringify(body) });
      mostrarMensaje(`Campaña "${creada.title}" creada con estado ${creada.status}.`, "ok");
    }
    limpiarFormulario();
    await cargarCampanias();
  } catch (err) {
    // 400 de validación, 404 si la organización no existe, 409 si no está aprobada.
    mostrarMensaje(err.message, "error");
  }
});

btnCancelar.addEventListener("click", () => {
  limpiarFormulario();
  mostrarMensaje("", "");
});

/** Primero las organizaciones (para el <select> y los nombres), después las campañas. */
async function iniciar() {
  try {
    await cargarOrganizaciones();
    await cargarCampanias();
  } catch (err) {
    mostrarMensaje(`No se pudieron cargar los datos: ${err.message}`, "error");
  }
}

iniciar();
