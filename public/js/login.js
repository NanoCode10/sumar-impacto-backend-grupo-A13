/**
 * FORMULARIO DE INGRESO (corre en el navegador)
 * Manda usuario y contraseña a POST /api/auth/login.
 * Guarda la sesión en el servidor y redirige al inicio al autenticarse.
 */

const form = document.getElementById("login-form");

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  try {
    const respuesta = await pedir("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({
        usuario: form.elements.usuario.value,
        password: form.elements.password.value
      })
    });
    const user = respuesta.user || respuesta;
    mostrarMensaje(`Login correcto. Bienvenido/a, ${user.name} (${user.role}). Redirigiendo...`, "ok");
    setTimeout(() => {
      window.location.href = "/";
    }, 800);
  } catch (err) {
    mostrarMensaje(err.message, "error");
    form.elements.password.value = "";
    form.elements.password.focus();
  }
});
