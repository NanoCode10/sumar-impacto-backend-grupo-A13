/**
 * CHAT INTERNO (corre en el navegador, no en Node)
 * io() se conecta al mismo servidor que entregó la página; la cookie de sesión viaja sola.
 * El navegador sólo manda el texto: quién lo escribió lo decide el servidor.
 * Todo lo que llega se muestra como TEXTO (textContent), nunca como HTML: contra XSS.
 */

const socket = io();

const lista = document.getElementById("mensajes");
const aviso = document.getElementById("aviso");
const conectados = document.getElementById("conectados");
const ayuda = document.getElementById("asistente-ayuda");
const form = document.getElementById("chat-form");
const input = document.getElementById("texto");

// La tarjeta del chat ocupa lo que queda de pantalla debajo del encabezado.
const tarjeta = document.querySelector(".chat");
function ajustarAlto() {
  const arriba = tarjeta.getBoundingClientRect().top + window.scrollY;
  tarjeta.style.height = `${Math.max(320, window.innerHeight - arriba - 16)}px`;
}
ajustarAlto();
window.addEventListener("resize", ajustarAlto);

const hora = (fecha) => new Date(fecha).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });

function agregarMensaje({ autor, texto, fecha, tipo }) {
  const li = document.createElement("li");
  if (tipo === "asistente") li.classList.add("asistente");

  const spanHora = document.createElement("span");
  spanHora.className = "hora";
  spanHora.textContent = hora(fecha);

  const spanAutor = document.createElement("span");
  spanAutor.className = "autor";
  spanAutor.textContent = `${autor}:`;

  li.append(spanHora, spanAutor, document.createTextNode(texto));
  lista.appendChild(li);
  lista.scrollTop = lista.scrollHeight;
}

socket.on("historial", (mensajes) => {
  lista.replaceChildren();
  mensajes.forEach(agregarMensaje);
});

socket.on("mensaje", (mensaje) => {
  agregarMensaje(mensaje);
  if (mensaje.tipo === "asistente") aviso.textContent = "";
});

socket.on("aviso", (texto) => {
  aviso.textContent = texto;
});

socket.on("conectados", (cantidad) => {
  conectados.textContent = cantidad;
});

socket.on("asistente", ({ configurado, prefijo }) => {
  ayuda.textContent = configurado
    ? `Mensajes en tiempo real entre los usuarios del sistema. Para consultar al asistente, empezá el mensaje con ${prefijo}.`
    : "Mensajes en tiempo real entre los usuarios del sistema. El asistente no está configurado en este servidor.";
});

// Si el servidor rechaza la conexión (sin sesión), se informa.
socket.on("connect_error", (err) => {
  aviso.textContent = `No se pudo conectar al chat: ${err.message}`;
});

form.addEventListener("submit", (event) => {
  event.preventDefault();
  if (input.value.trim() === "") return;
  socket.emit("mensaje", input.value);
  input.value = "";
  input.focus();
});
