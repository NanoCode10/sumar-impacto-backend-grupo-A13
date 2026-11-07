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
 *   con un cupo (ver crearCupo): la cuota gratuita de Gemini es limitada y compartida.
 * - Sin historial en la base: se guardan en memoria los últimos mensajes, para quien entra.
 */

export const LARGO_MAXIMO = 500;
export const PREFIJO_ASISTENTE = "@gemini";
const MENSAJES_EN_MEMORIA = 50;

// Cupo del asistente. Vive en memoria: se reinicia con cada despliegue o reinicio del
// servidor (con más uso iría en la base).
export const CUPO = {
  esperaMs: 15000, // entre dos consultas del mismo usuario
  porUsuarioPorDia: 10,
  totalPorDia: 50
};

// El "día" es el de Argentina, no el de UTC: si no, el cupo se renovaría a las 21 h.
const formatoDia = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Buenos_Aires" });
export const diaArgentina = (fecha = new Date()) => formatoDia.format(fecha); // AAAA-MM-DD

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

/**
 * Cupo de consultas al asistente: una cada tantos segundos por usuario, un tope diario por
 * usuario y un tope diario total. consumir() devuelve { ok: true } y registra la consulta,
 * o { ok: false, motivo } sin registrar nada. Los contadores se reinician al cambiar el día.
 */
export function crearCupo({ esperaMs, porUsuarioPorDia, totalPorDia } = CUPO, dia = diaArgentina) {
  const ultimaConsulta = new Map();
  let diaActual = null;
  let porUsuario = new Map();
  let total = 0;

  return {
    consumir(usuarioId, ahora = Date.now()) {
      const hoy = dia(new Date(ahora));
      if (hoy !== diaActual) {
        diaActual = hoy;
        porUsuario = new Map();
        total = 0;
      }

      if (ahora - (ultimaConsulta.get(usuarioId) ?? -Infinity) < esperaMs) {
        return { ok: false, motivo: "Esperá unos segundos antes de volver a consultar al asistente" };
      }
      const delUsuario = porUsuario.get(usuarioId) ?? 0;
      if (delUsuario >= porUsuarioPorDia) {
        return { ok: false, motivo: `Llegaste al límite de ${porUsuarioPorDia} consultas diarias al asistente` };
      }
      if (total >= totalPorDia) {
        return { ok: false, motivo: "El asistente llegó a su límite de consultas por hoy. Vuelve a estar disponible mañana." };
      }

      ultimaConsulta.set(usuarioId, ahora);
      porUsuario.set(usuarioId, delUsuario + 1);
      total += 1;
      return { ok: true, usadasHoy: total };
    }
  };
}

/**
 * Presencia por USUARIO, no por conexión: una misma persona puede tener varias pestañas,
 * y al recargar la página la conexión nueva llega antes de que se cierre la vieja.
 * entrar() devuelve true sólo si el usuario pasa de 0 a 1 conexiones; salir(), sólo si
 * cierra la última. Así no hay avisos falsos de «se conectó» o «se desconectó».
 */
export function crearPresencia() {
  const conexiones = new Map();
  return {
    entrar(usuarioId) {
      const cantidad = (conexiones.get(usuarioId) ?? 0) + 1;
      conexiones.set(usuarioId, cantidad);
      return cantidad === 1;
    },
    salir(usuarioId) {
      const cantidad = (conexiones.get(usuarioId) ?? 1) - 1;
      if (cantidad <= 0) {
        conexiones.delete(usuarioId);
        return true;
      }
      conexiones.set(usuarioId, cantidad);
      return false;
    },
    get usuarios() {
      return conexiones.size;
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

export function registrarChat(io, { asistente, cupo = crearCupo() }) {
  const ultimos = [];
  const presencia = crearPresencia();

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
    if (presencia.entrar(usuario.id)) {
      socket.broadcast.emit("aviso", `${usuario.nombre} se conectó`);
    }
    io.emit("conectados", presencia.usuarios);

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
      const consulta = cupo.consumir(usuario.id);
      if (!consulta.ok) {
        return socket.emit("aviso", consulta.motivo);
      }
      // Registro mínimo: cuántas consultas van en el día, sin guardar el contenido.
      console.log(`Consulta al asistente: ${consulta.usadasHoy} de ${CUPO.totalPorDia} hoy`);

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
      if (presencia.salir(usuario.id)) {
        io.emit("aviso", `${usuario.nombre} se desconectó`);
      }
      io.emit("conectados", presencia.usuarios);
    });
  });
}
