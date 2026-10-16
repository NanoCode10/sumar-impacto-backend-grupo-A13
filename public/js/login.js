/**
 * FORMULARIO DE INGRESO (corre en el navegador)
 * Manda usuario y contraseña a POST /api/auth/login y muestra el resultado.
 * No hay sesión: la verificación no deja al usuario «adentro» de la aplicación.
 */

const form = document.getElementById("login-form");

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  try {
    const user = await pedir("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({
        usuario: form.elements.usuario.value,
        password: form.elements.password.value
      })
    });
    mostrarMensaje(`Login correcto. Bienvenido/a, ${user.name} (${user.role}).`, "ok");
    form.reset();
  } catch (err) {
    mostrarMensaje(err.message, "error");
    form.elements.password.value = "";
    form.elements.password.focus();
  }
});
