const API = "/api/donors";

const form = document.getElementById("donor-form");
const tbody = document.getElementById("donor-tbody");
const tituloForm = document.getElementById("form-titulo");
const btnCancelar = document.getElementById("btn-cancelar");

function crearFila(donor) {
  const tr = document.createElement("tr");
  tr.append(
    celda(donor.name),
    celda(donor.type),
    celda(donor.document),
    celda(donor.email),
    celda(donor.isMember ? "Sí" : "No"),
    celdaBadge(donor.status),
    celdaAcciones(() => editar(donor), () => eliminar(donor))
  );
  return tr;
}

async function cargarDonantes() {
  try {
    const donantes = await pedir(API);

    if (donantes.length === 0) {
      filaUnica(tbody, "Sin donantes registrados.", 7);
      return;
    }

    tbody.replaceChildren(...donantes.map(crearFila));
  } catch (err) {
    filaUnica(tbody, `No se pudo cargar el listado: ${err.message}`, 7);
  }
}

function limpiarFormulario() {
  form.reset();
  form.elements.id.value = "";
  tituloForm.textContent = "Nuevo donante";
  btnCancelar.hidden = true;
}

function editar(donor) {
  form.elements.id.value = donor.id;
  form.elements.name.value = donor.name;
  form.elements.type.value = donor.type;
  form.elements.document.value = donor.document;
  form.elements.email.value = donor.email;
  form.elements.isMember.checked = donor.isMember;
  tituloForm.textContent = `Editando: ${donor.name}`;
  btnCancelar.hidden = false;
  mostrarMensaje("", "");
  form.elements.name.focus();
}

async function eliminar(donor) {
  if (!confirm(`¿Eliminar el donante "${donor.name}"?`)) {
    return;
  }

  try {
    await pedir(urlRecurso(API, donor.id), { method: "DELETE" });
    if (form.elements.id.value === String(donor.id)) {
      limpiarFormulario();
    }
    mostrarMensaje(`Donante "${donor.name}" eliminado.`, "ok");
    await cargarDonantes();
  } catch (err) {
    mostrarMensaje(err.message, "error");
  }
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const id = form.elements.id.value;
  const body = {
    name: form.elements.name.value,
    type: form.elements.type.value,
    document: form.elements.document.value,
    email: form.elements.email.value,
    isMember: form.elements.isMember.checked
  };

  try {
    if (id) {
      const actualizado = await pedir(urlRecurso(API, id), {
        method: "PUT",
        body: JSON.stringify(body)
      });
      mostrarMensaje(`Donante "${actualizado.name}" actualizado.`, "ok");
    } else {
      const creado = await pedir(API, { method: "POST", body: JSON.stringify(body) });
      mostrarMensaje(`Donante "${creado.name}" creado con estado ${creado.status}.`, "ok");
    }
    limpiarFormulario();
    await cargarDonantes();
  } catch (err) {
    mostrarMensaje(err.message, "error");
  }
});

btnCancelar.addEventListener("click", () => {
  limpiarFormulario();
  mostrarMensaje("", "");
});

cargarDonantes();