const API = "/api/donations";
const API_DONANTES = "/api/donors";
const API_CAMPANIAS = "/api/campaigns";

const form = document.getElementById("donation-form");
const tbody = document.getElementById("donation-tbody");
const selectDonante = document.getElementById("donorId");
const selectCampania = document.getElementById("campaignId");
const tituloForm = document.getElementById("form-titulo");
const btnCancelar = document.getElementById("btn-cancelar");

const donantesPorId = new Map();
const campaniasPorId = new Map();
let donacionEnEdicion = null;

function opcionRecurso(recurso, etiqueta) {
  return new Option(`${etiqueta} (${recurso.status})`, String(recurso.id));
}

async function cargarReferencias() {
  const [donantes, campanias] = await Promise.all([
    pedir(API_DONANTES),
    pedir(API_CAMPANIAS)
  ]);

  donantesPorId.clear();
  campaniasPorId.clear();

  for (const donante of donantes) donantesPorId.set(String(donante.id), donante);
  for (const campania of campanias) campaniasPorId.set(String(campania.id), campania);

  const donantesActivos = donantes.filter((donante) => donante.status === "activo");
  const campaniasActivas = campanias.filter((campania) => campania.status === "activa");

  selectDonante.replaceChildren(
    new Option("-- Elegí un donante activo --", ""),
    ...donantesActivos.map((donante) => opcionRecurso(donante, donante.name))
  );
  selectCampania.replaceChildren(
    new Option("-- Elegí una campaña activa --", ""),
    ...campaniasActivas.map((campania) => opcionRecurso(campania, campania.title))
  );
}

function nombreDonante(id) {
  const donante = donantesPorId.get(String(id));
  return donante ? donante.name : `Donante ${id}`;
}

function nombreCampania(id) {
  const campania = campaniasPorId.get(String(id));
  return campania ? campania.title : `Campaña ${id}`;
}

function crearFila(donacion) {
  const tr = document.createElement("tr");
  const fecha = donacion.createdAt ? new Date(donacion.createdAt).toLocaleDateString("es-AR") : "—";
  tr.append(
    celda(fecha),
    celda(nombreDonante(donacion.donorId)),
    celda(nombreCampania(donacion.campaignId)),
    celda(`$${donacion.grossAmount}`),
    celda(`$${donacion.netAmount}`),
    celda(donacion.paymentMethod),
    celdaBadge(donacion.status),
    celdaAcciones(() => editar(donacion), () => anular(donacion))
  );
  return tr;
}

async function cargarDonaciones() {
  const donaciones = await pedir(API);

  if (donaciones.length === 0) {
    filaUnica(tbody, "Sin donaciones registradas.", 8);
    return;
  }
  tbody.replaceChildren(...donaciones.map(crearFila));
}

function agregarOpcionTemporal(select, id, recurso, nombre) {
  if (Array.from(select.options).some((option) => option.value === String(id))) {
    return;
  }
  const option = recurso
    ? opcionRecurso(recurso, nombre)
    : new Option(`${nombre} (no disponible)`, String(id));
  option.dataset.temporal = "true";
  select.add(option);
}

function limpiarFormulario() {
  form.reset();
  selectDonante.querySelectorAll("[data-temporal]").forEach((option) => option.remove());
  selectCampania.querySelectorAll("[data-temporal]").forEach((option) => option.remove());
  selectCampania.disabled = false;
  donacionEnEdicion = null;
  tituloForm.textContent = "Nueva donación";
  btnCancelar.hidden = true;
}

function editar(donacion) {
  donacionEnEdicion = donacion;
  const donante = donantesPorId.get(String(donacion.donorId));
  const campania = campaniasPorId.get(String(donacion.campaignId));

  agregarOpcionTemporal(selectDonante, donacion.donorId, donante, nombreDonante(donacion.donorId));
  agregarOpcionTemporal(selectCampania, donacion.campaignId, campania, nombreCampania(donacion.campaignId));

  form.elements.donorId.value = String(donacion.donorId);
  form.elements.campaignId.value = String(donacion.campaignId);
  form.elements.grossAmount.value = donacion.grossAmount;
  form.elements.paymentMethod.value = donacion.paymentMethod;
  selectCampania.disabled = true;
  tituloForm.textContent = `Editando donación de ${nombreDonante(donacion.donorId)}`;
  btnCancelar.hidden = false;
  mostrarMensaje("", "");
  form.elements.grossAmount.focus();
}

async function anular(donacion) {
  if (!confirm("¿Anular esta donación? Esta acción no se puede deshacer.")) {
    return;
  }

  try {
    await pedir(urlRecurso(API, donacion.id), { method: "DELETE" });
    if (donacionEnEdicion && donacionEnEdicion.id === donacion.id) {
      limpiarFormulario();
    }
    mostrarMensaje("Donación anulada correctamente.", "ok");
    await cargarDonaciones();
  } catch (err) {
    mostrarMensaje(err.message, "error");
  }
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const donante = donantesPorId.get(form.elements.donorId.value);
  const body = {
    grossAmount: form.elements.grossAmount.valueAsNumber,
    paymentMethod: form.elements.paymentMethod.value
  };

  if (donacionEnEdicion) {
    if (donante && String(donante.id) !== String(donacionEnEdicion.donorId)) {
      body.donorId = donante.id;
    }
  } else {
    body.donorId = donante ? donante.id : form.elements.donorId.value;
    body.campaignId = form.elements.campaignId.value;
  }

  try {
    if (donacionEnEdicion) {
      await pedir(urlRecurso(API, donacionEnEdicion.id), {
        method: "PUT",
        body: JSON.stringify(body)
      });
      mostrarMensaje("Donación actualizada.", "ok");
    } else {
      await pedir(API, { method: "POST", body: JSON.stringify(body) });
      mostrarMensaje("Donación registrada.", "ok");
    }
    limpiarFormulario();
    await cargarDonaciones();
  } catch (err) {
    mostrarMensaje(err.message, "error");
  }
});

btnCancelar.addEventListener("click", () => {
  limpiarFormulario();
  mostrarMensaje("", "");
});

async function iniciar() {
  try {
    await cargarReferencias();
    await cargarDonaciones();
  } catch (err) {
    mostrarMensaje(`No se pudieron cargar los datos: ${err.message}`, "error");
    filaUnica(tbody, `No se pudo cargar el listado: ${err.message}`, 8);
  }
}

iniciar();
