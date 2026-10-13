/**
 * FRONTEND DE ORGANIZACIONES (corre en el navegador, no en Node)
 * Consume la API JSON con fetch() y actualiza la tabla sin recargar la página:
 *  - GET    /api/organizations      -> listar
 *  - POST   /api/organizations      -> crear
 *  - PUT    /api/organizations/:id  -> editar
 *  - DELETE /api/organizations/:id  -> eliminar
 *
 * El mismo formulario sirve para alta y edición: si el campo oculto tiene un id,
 * se edita esa organización; si está vacío, se crea una nueva.
 *
 * Las validaciones y reglas de negocio (400, 404, 409) las resuelve el backend;
 * acá sólo se muestra el mensaje { error } que devuelve la API.
 * Las funciones pedir, urlRecurso, mostrarMensaje, celda... vienen de comun.js.
 */

const API = "/api/organizations";

const form = document.getElementById("org-form");
const tbody = document.getElementById("org-tbody");
const tituloForm = document.getElementById("form-titulo");
const btnCancelar = document.getElementById("btn-cancelar");

function crearFila(org) {
  const tr = document.createElement("tr");
  tr.append(
    celdaEnlace(org.name, urlRecurso("/organizations", org.id)),
    celda(org.type),
    celda(org.email),
    celdaBadge(org.status),
    celdaAcciones(() => editar(org), () => eliminar(org))
  );
  return tr;
}

/** Pide el listado a la API y vuelve a dibujar la tabla completa. */
async function cargarOrganizaciones() {
  try {
    const organizaciones = await pedir(API);

    if (organizaciones.length === 0) {
      filaUnica(tbody, "Sin organizaciones registradas.", 5);
      return;
    }
    tbody.replaceChildren(...organizaciones.map(crearFila));
  } catch (err) {
    mostrarMensaje(`No se pudo cargar el listado: ${err.message}`, "error");
  }
}

/** Vuelve el formulario al modo alta. */
function limpiarFormulario() {
  form.reset();
  form.elements.id.value = "";
  tituloForm.textContent = "Nueva organización";
  btnCancelar.hidden = true;
}

/** Carga los datos de la organización en el formulario para editarla. */
function editar(org) {
  form.elements.id.value = org.id;
  form.elements.name.value = org.name;
  form.elements.type.value = org.type;
  form.elements.email.value = org.email;
  form.elements.status.value = org.status;
  tituloForm.textContent = `Editando: ${org.name}`;
  btnCancelar.hidden = false;
  mostrarMensaje("", "");
  form.elements.name.focus();
}

async function eliminar(org) {
  if (!confirm(`¿Eliminar la organización "${org.name}"?`)) {
    return;
  }

  try {
    await pedir(urlRecurso(API, org.id), { method: "DELETE" });
    // Si justo se estaba editando esta organización, el formulario vuelve a alta.
    if (form.elements.id.value === String(org.id)) {
      limpiarFormulario();
    }
    mostrarMensaje(`Organización "${org.name}" eliminada.`, "ok");
    await cargarOrganizaciones();
  } catch (err) {
    // Por ejemplo, el 409 de una organización que todavía tiene campañas.
    mostrarMensaje(err.message, "error");
  }
}

form.addEventListener("submit", async (event) => {
  // Sin esto el navegador enviaría el formulario y recargaría la página.
  event.preventDefault();

  const id = form.elements.id.value;

  // Se arma el body con los valores de los campos del DOM. Todos son textos,
  // que es el tipo que espera validateBody para una organización.
  const body = {
    name: form.elements.name.value,
    type: form.elements.type.value,
    email: form.elements.email.value
  };
  // El estado es opcional: si no se elige, no se manda y el backend aplica su
  // valor por defecto (en alta) o deja el actual (en edición).
  if (form.elements.status.value !== "") {
    body.status = form.elements.status.value;
  }

  try {
    if (id) {
      const actualizada = await pedir(urlRecurso(API, id), {
        method: "PUT",
        body: JSON.stringify(body)
      });
      mostrarMensaje(`Organización "${actualizada.name}" actualizada.`, "ok");
    } else {
      const creada = await pedir(API, { method: "POST", body: JSON.stringify(body) });
      mostrarMensaje(`Organización "${creada.name}" creada con estado ${creada.status}.`, "ok");
    }
    limpiarFormulario();
    await cargarOrganizaciones();
  } catch (err) {
    mostrarMensaje(err.message, "error");
  }
});

btnCancelar.addEventListener("click", () => {
  limpiarFormulario();
  mostrarMensaje("", "");
});

cargarOrganizaciones();
