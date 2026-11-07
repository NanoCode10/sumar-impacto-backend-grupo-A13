import User from "../models/User.js";

/**
 * CHAT INTERNO EN TIEMPO REAL (Socket.IO)
 *
 * - Sólo usuarios con sesión: la conexión usa la misma cookie de sesión que el resto del
 *   sistema (ver index.js). El nombre de quien escribe lo pone el servidor desde la sesión,
 *   no el navegador: nadie puede hacerse pasar por otro.
 * - Lo que llega por el socket es entrada del usuario: se valida acá y el navegador lo
 *   muestra como texto, nunca como HTML.
 * - Mensajes que empiezan con @gemini: además de difundirse, se consultan al asistente,
 *   con un límite de consultas por usuario (cada consulta tiene costo).
 * - Sin historial en la base: se guardan en memoria los últimos mensajes, para quien entra.
 */

export const LARGO_MAXIMO = 500;
export const PREFIJO_ASISTENTE = "@gemini";
const ESPERA_ENTRE_CONSULTAS_MS = 15000;
const MENSAJES_EN_MEMORIA = 50;

/** Devuelve el texto limpio si es un mensaje válido, o null. */
export function validarMensaje(texto) {
  if (typeof texto !== "string") return null;
  const limpio = texto.trim();
  if (limpio === "" || limpio.length > LARGO_MAXIMO) return null;
  return limpio;
}

/** Si el mensaje es una consulta al asistente, devuelve la pregunta; si no, null. */
export function preguntaParaAsistente(texto) {
  if (!texto.toLowerCase().startsWith(PREFIJO_ASISTENTE)) return null;
  const pregunta = texto.slice(PREFIJO_ASISTENTE.length).trim();
  return pregunta === "" ? null : pregunta;
}

/** Una consulta cada `esperaMs` por usuario. puede() la registra si está permitida. */
export function crearLimitador(esperaMs = ESPERA_ENTRE_CONSULTAS_MS) {
  const ultimaConsulta = new Map();
  return {
    puede(usuarioId, ahora = Date.now()) {
      const ultima = ultimaConsulta.get(usuarioId) ?? -Infinity;
      if (ahora - ultima < esperaMs) return false;
      ultimaConsulta.set(usuarioId, ahora);
      return true;
    }
  };
}

/**
 * Exige sesión para conectarse. Relee el usuario de la base, igual que el resto del
 * sistema: un usuario dado de baja no entra aunque conserve la cookie.
 */
async function exigirSesion(socket, next) {
  try {
    const id = socket.request.session?.user?.id;
    const user = id ? await User.findById(id) : null;
    if (!user) {
      return next(new Error("Debe iniciar sesión para usar el chat"));
    }
    socket.data.usuario = { id: user.id, nombre: user.name, rol: user.role };
    next();
  } catch (err) {
    next(err);
  }
}

export function registrarChat(io, { asistente, limitador = crearLimitador() }) {
  const ultimos = [];

  function difundir(mensaje) {
    ultimos.push(mensaje);
    if (ultimos.length > MENSAJES_EN_MEMORIA) ultimos.shift();
    io.emit("mensaje", mensaje);
  }

  io.use(exigirSesion);

  io.on("connection", (socket) => {
    const { usuario } = socket.data;

    socket.emit("historial", ultimos);
    socket.emit("asistente", { configurado: asistente.configurado, prefijo: PREFIJO_ASISTENTE });
    io.emit("conectados", io.engine.clientsCount);
    socket.broadcast.emit("aviso", `${usuario.nombre} se conectó`);

    socket.on("mensaje", async (texto) => {
      const limpio = validarMensaje(texto);
      if (!limpio) {
        return socket.emit("aviso", `El mensaje tiene que tener entre 1 y ${LARGO_MAXIMO} caracteres`);
      }

      difundir({ autor: usuario.nombre, rol: usuario.rol, texto: limpio, fecha: new Date().toISOString(), tipo: "usuario" });

      const pregunta = preguntaParaAsistente(limpio);
      if (!pregunta) return;

      if (!asistente.configurado) {
        return socket.emit("aviso", "El asistente no está configurado en este servidor");
      }
      if (!limitador.puede(usuario.id)) {
        return socket.emit("aviso", "Esperá unos segundos antes de volver a consultar al asistente");
      }

      io.emit("aviso", "Gemini está escribiendo…");
      try {
        const respuesta = await asistente.responder(pregunta);
        difundir({ autor: "Gemini", rol: "asistente", texto: respuesta, fecha: new Date().toISOString(), tipo: "asistente" });
      } catch (err) {
        // Sin este catch, el rechazo quedaría sin atender y Node terminaría el proceso.
        console.error("Error al consultar al asistente:", err.message);
        socket.emit("aviso", "El asistente no pudo responder. Probá de nuevo en un rato.");
      }
    });

    socket.on("disconnect", () => {
      io.emit("conectados", io.engine.clientsCount);
      io.emit("aviso", `${usuario.nombre} se desconectó`);
    });
  });
}
