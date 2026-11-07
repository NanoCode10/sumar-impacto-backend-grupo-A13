/**
 * FRONTEND DE DONACIONES (corre en el navegador, no en Node)
 * Contra /api/donations: GET para el listado, POST para registrar y DELETE para anular.
 * Una donación no se edita: si tiene un error, se anula y se registra una nueva. La
 * anulada sigue en el listado, con su estado.
 */

const API = "/api/donations";
const API_DONANTES = "/api/donors";
const API_CAMPANIAS = "/api/campaigns";

const form = document.getElementById("donation-form");
const tbody = document.getElementById("donation-tbody");
const selectDonante = document.getElementById("donorId");
const selectCampania = document.getElementById("campaignId");

const donantesPorId = new Map();
const campaniasPorId = new Map();

const COLUMNAS = 9;
const pesos = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" });

function opcionRecurso(recurso, etiqueta) {
  return new Option(`${etiqueta} (${recurso.status})`, String(recurso.id));
}

async function cargarReferencias() {
  const [donantes, campanias] = await Promise.all([pedir(API_DONANTES), pedir(API_CAMPANIAS)]);

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

// Sólo una donación acreditada se puede anular.
function celdaAnular(donacion) {
  const td = document.createElement("td");
  if (donacion.status === "acreditada") {
    td.appendChild(boton("Anular", () => anular(donacion)));
  }
  return td;
}

function crearFila(donacion) {
  const tr = document.createElement("tr");
  const fecha = donacion.createdAt ? new Date(donacion.createdAt).toLocaleDateString("es-AR") : "—";
  tr.append(
    celda(fecha),
    celda(donacion.certificateCode),
    celda(nombreDonante(donacion.donorId)),
    celda(nombreCampania(donacion.campaignId)),
    celda(pesos.format(donacion.grossAmount)),
    celda(pesos.format(donacion.netAmount)),
    celda(donacion.paymentMethod),
    celdaBadge(donacion.status),
    celdaAnular(donacion)
  );
  return tr;
}

async function cargarDonaciones() {
  const donaciones = await pedir(API);

  if (donaciones.length === 0) {
    filaUnica(tbody, "Sin donaciones registradas.", COLUMNAS);
    return;
  }
  tbody.replaceChildren(...donaciones.map(crearFila));
}

async function anular(donacion) {
  if (!confirm(`¿Anular la donación ${donacion.certificateCode}? Queda registrada como anulada.`)) {
    return;
  }

  try {
    await pedir(urlRecurso(API, donacion.id), { method: "DELETE" });
    mostrarMensaje(`Donación ${donacion.certificateCode} anulada.`, "ok");
    await cargarDonaciones();
  } catch (err) {
    mostrarMensaje(err.message, "error");
  }
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const body = {
    donorId: form.elements.donorId.value,
    campaignId: form.elements.campaignId.value,
    grossAmount: form.elements.grossAmount.valueAsNumber,
    paymentMethod: form.elements.paymentMethod.value
  };

  try {
    const creada = await pedir(API, { method: "POST", body: JSON.stringify(body) });
    mostrarMensaje(`Donación registrada con el certificado ${creada.certificateCode}.`, "ok");
    form.reset();
    await cargarDonaciones();
  } catch (err) {
    mostrarMensaje(err.message, "error");
  }
});

async function iniciar() {
  try {
    await cargarReferencias();
    await cargarDonaciones();
  } catch (err) {
    mostrarMensaje(`No se pudieron cargar los datos: ${err.message}`, "error");
    filaUnica(tbody, `No se pudo cargar el listado: ${err.message}`, COLUMNAS);
  }
}

iniciar();
