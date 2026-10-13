/**
 * FORMULARIO DE INGRESO (corre en el navegador)
 * Manda usuario y contraseña a POST /api/auth/login. Si coinciden, el servidor
 * crea la sesión y deja la cookie; acá sólo se navega al destino. El destino
 * (data-volver) ya viene validado por el servidor: siempre es de este sitio.
 */

const form = document.getElementById("login-form");

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  try {
    await pedir("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({
        usuario: form.elements.usuario.value,
        password: form.elements.password.value
      })
    });
    window.location.href = form.dataset.volver;
  } catch (err) {
    mostrarMensaje(err.message, "error");
    form.elements.password.value = "";
    form.elements.password.focus();
  }
});
