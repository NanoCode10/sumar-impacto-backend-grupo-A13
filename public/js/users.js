/**
 * FRONTEND DE USUARIOS (corre en el navegador, no en Node)
 * Mismo esquema que organizations.js, contra /api/users:
 *  - GET /api/users, POST /api/users, PUT /api/users/:id, DELETE /api/users/:id
 *
 * Diferencias con organizaciones:
 *  - el username se elige en el alta y no se edita (el campo se bloquea);
 *  - la contraseña es obligatoria al crear y opcional al editar: vacía, no se
 *    manda y queda la actual.
 * La regla del 409 (no dejar el sistema sin superadmin) la resuelve el backend;
 * acá sólo se muestra el mensaje.
 */

const API = "/api/users";

const form = document.getElementById("user-form");
const tbody = document.getElementById("user-tbody");
const tituloForm = document.getElementById("form-titulo");
const btnCancelar = document.getElementById("btn-cancelar");

function crearFila(user) {
  const tr = document.createElement("tr");
  tr.append(
    celda(user.username),
    celda(user.name),
    celda(user.email),
    celdaBadge(user.role),
    celdaAcciones(() => editar(user), () => eliminar(user))
  );
  return tr;
}

/** Pide el listado a la API y vuelve a dibujar la tabla completa. */
async function cargarUsuarios() {
  try {
    const usuarios = await pedir(API);

    if (usuarios.length === 0) {
      filaUnica(tbody, "Sin usuarios registrados.", 5);
      return;
    }
    tbody.replaceChildren(...usuarios.map(crearFila));
  } catch (err) {
    mostrarMensaje(`No se pudo cargar el listado: ${err.message}`, "error");
  }
}

/** Vuelve el formulario al modo alta. */
function limpiarFormulario() {
  form.reset();
  form.elements.id.value = "";
  form.elements.username.disabled = false;
  form.elements.password.required = true;
  tituloForm.textContent = "Nuevo usuario";
  btnCancelar.hidden = true;
}

/** Carga los datos del usuario en el formulario para editarlo. */
function editar(user) {
  form.elements.id.value = user.id;
  form.elements.username.value = user.username;
  form.elements.username.disabled = true;
  form.elements.name.value = user.name;
  form.elements.email.value = user.email;
  form.elements.role.value = user.role;
  form.elements.password.value = "";
  form.elements.password.required = false;
  tituloForm.textContent = `Editando: ${user.username}`;
  btnCancelar.hidden = false;
  mostrarMensaje("", "");
  form.elements.name.focus();
}

async function eliminar(user) {
  if (!confirm(`¿Eliminar el usuario "${user.username}"?`)) {
    return;
  }

  try {
    await pedir(urlRecurso(API, user.id), { method: "DELETE" });
    if (form.elements.id.value === String(user.id)) {
      limpiarFormulario();
    }
    mostrarMensaje(`Usuario "${user.username}" eliminado.`, "ok");
    await cargarUsuarios();
  } catch (err) {
    // Por ejemplo, el 409 de eliminar al último superadmin.
    mostrarMensaje(err.message, "error");
  }
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const id = form.elements.id.value;
  const body = {
    name: form.elements.name.value,
    email: form.elements.email.value,
    role: form.elements.role.value
  };
  // En el alta van username y contraseña; en la edición, la contraseña sólo si
  // se escribió una nueva.
  if (!id) {
    body.username = form.elements.username.value;
  }
  if (form.elements.password.value !== "") {
    body.password = form.elements.password.value;
  }

  try {
    if (id) {
      const actualizado = await pedir(urlRecurso(API, id), { method: "PUT", body: JSON.stringify(body) });
      mostrarMensaje(`Usuario "${actualizado.username}" actualizado.`, "ok");
    } else {
      const creado = await pedir(API, { method: "POST", body: JSON.stringify(body) });
      mostrarMensaje(`Usuario "${creado.username}" creado con rol ${creado.role}.`, "ok");
    }
    limpiarFormulario();
    await cargarUsuarios();
  } catch (err) {
    mostrarMensaje(err.message, "error");
  }
});

btnCancelar.addEventListener("click", () => {
  limpiarFormulario();
  mostrarMensaje("", "");
});

limpiarFormulario();
cargarUsuarios();
