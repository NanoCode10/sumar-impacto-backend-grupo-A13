/**
 * BOTÓN "SALIR" DEL MENÚ (corre en el navegador, en todas las páginas)
 * Cierra la sesión con POST /api/auth/logout y vuelve al inicio. Es POST y no un
 * enlace: un GET lo podría disparar cualquier otra página o la precarga del navegador.
 */
const botonSalir = document.getElementById("btn-salir");

if (botonSalir) {
  botonSalir.addEventListener("click", async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/";
  });
}
