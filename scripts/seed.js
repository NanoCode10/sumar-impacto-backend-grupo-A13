import dotenv from "dotenv";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import mongoose from "mongoose";

import { conectarDB } from "../config/db.js";
import Organization from "../models/Organization.js";
import Campaign from "../models/Campaign.js";
import User from "../models/User.js";

/**
 * SCRIPT DE INICIALIZACIÓN DE DATOS (seed)
 * Uso: npm run seed -- --confirm-db=sumarimpacto
 *
 * PROTECCIÓN: hay que confirmar el nombre de la base destino con --confirm-db.
 * Después de conectar se compara con el nombre REAL de la base (Mongoose) y, si
 * falta o no coincide, el script termina antes de escribir nada.
 *
 * Carga en MongoDB las organizaciones y campañas de ejemplo de data/*.json, que
 * eran la persistencia de la primera entrega y quedan como datos de referencia.
 * Los archivos JSON sólo se LEEN: nunca se modifican.
 *
 * Se puede ejecutar varias veces sin duplicar nada y sin borrar nada:
 *  - una organización se crea sólo si no existe otra con el mismo email;
 *  - una campaña se crea sólo si su organización no tiene ya una con el mismo título;
 *  - un usuario se crea sólo si no existe otro con el mismo username o email.
 *
 * data/users.json trae usuarios FICTICIOS, uno por rol, con contraseñas de prueba
 * conocidas (documentadas en el README). En el JSON van sin hashear porque son
 * datos de prueba; User.crear las hashea al cargarlas y en la base queda sólo el hash.
 *
 * En los JSON las campañas apuntan a su organización con un id numérico
 * (organizationId: 1). En MongoDB los ids son ObjectId: por eso se arma una tabla
 * "id del JSON -> ObjectId" para guardar cada campaña con el ObjectId correcto.
 *
 * La base es la de MONGO_URI (.env). Para probarlo en otra base sin tocar la de
 * desarrollo se puede definir MONGO_URI al ejecutarlo (y confirmar esa base).
 */

dotenv.config({ quiet: true });

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const leerJSON = (archivo) =>
  JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", archivo), "utf-8"));

async function cargarOrganizaciones(organizaciones, idsNuevos, resumen) {
  for (const dato of organizaciones) {
    let organizacion = await Organization.findOne({ email: dato.email });

    if (organizacion) {
      resumen.omitidas += 1;
      console.log(`  = Organización omitida (ya existe): ${dato.name}`);
    } else {
      organizacion = await Organization.create({
        name: dato.name,
        type: dato.type,
        email: dato.email,
        status: dato.status
      });
      resumen.creadas += 1;
      console.log(`  + Organización creada: ${dato.name}`);
    }

    // También para las que ya existían: sus campañas necesitan el ObjectId.
    idsNuevos.set(dato.id, organizacion._id);
  }
}

async function cargarUsuarios(usuarios, resumen) {
  for (const dato of usuarios) {
    const existe =
      (await User.exists({ username: dato.username.toLowerCase() })) ||
      (await User.exists({ email: dato.email.toLowerCase() }));
    if (existe) {
      resumen.omitidas += 1;
      console.log(`  = Usuario omitido (ya existe): ${dato.username}`);
      continue;
    }

    await User.crear(dato);
    resumen.creadas += 1;
    console.log(`  + Usuario creado: ${dato.username} (${dato.role})`);
  }
}

async function cargarCampanias(campanias, idsNuevos, resumen) {
  for (const dato of campanias) {
    const organizationId = idsNuevos.get(dato.organizationId);

    if (!organizationId) {
      resumen.omitidas += 1;
      console.log(`  ! Campaña omitida: "${dato.title}" apunta a la organización ${dato.organizationId}, que no está en organizations.json`);
      continue;
    }

    const existe = await Campaign.exists({ organizationId, title: dato.title });
    if (existe) {
      resumen.omitidas += 1;
      console.log(`  = Campaña omitida (ya existe): ${dato.title}`);
      continue;
    }

    // Campaign.crear aplica las mismas reglas que la API: la organización debe
    // existir y estar aprobada.
    await Campaign.crear({
      organizationId,
      title: dato.title,
      description: dato.description,
      targetAmount: dato.targetAmount,
      status: dato.status
    });
    resumen.creadas += 1;
    console.log(`  + Campaña creada: ${dato.title}`);
  }
}

// Nombre de base escrito en --confirm-db=<nombre>, o undefined si no se pasó.
function baseConfirmada() {
  const argumento = process.argv.find((arg) => arg.startsWith("--confirm-db="));
  return argumento?.slice("--confirm-db=".length) || undefined;
}

async function main() {
  const confirmada = baseConfirmada();
  if (!confirmada) {
    throw new Error(
      "Falta confirmar la base destino. Uso: npm run seed -- --confirm-db=<nombre de la base>. No se escribió nada."
    );
  }

  const organizaciones = leerJSON("organizations.json");
  const campanias = leerJSON("campaigns.json");
  const usuarios = leerJSON("users.json");

  // Al conectar, Mongoose crea las colecciones de los modelos (autoCreate). Se
  // desactiva para que, si la base no es la confirmada, no quede nada creado en ella.
  mongoose.set("autoCreate", false);
  mongoose.set("autoIndex", false);

  await conectarDB();

  // Se compara con la base REAL de la conexión, no con lo que dice la URI.
  const conectada = mongoose.connection.name;
  if (conectada !== confirmada) {
    throw new Error(
      `La base conectada es "${conectada}" pero se confirmó "${confirmada}". No se escribió nada.`
    );
  }

  const idsNuevos = new Map();
  const resumenOrganizaciones = { creadas: 0, omitidas: 0 };
  const resumenCampanias = { creadas: 0, omitidas: 0 };
  const resumenUsuarios = { creadas: 0, omitidas: 0 };

  console.log("Organizaciones:");
  await cargarOrganizaciones(organizaciones, idsNuevos, resumenOrganizaciones);

  console.log("Campañas:");
  await cargarCampanias(campanias, idsNuevos, resumenCampanias);

  console.log("Usuarios:");
  await cargarUsuarios(usuarios, resumenUsuarios);

  console.log("\nResumen:");
  console.log(`  Organizaciones -> creadas: ${resumenOrganizaciones.creadas}, omitidas: ${resumenOrganizaciones.omitidas}`);
  console.log(`  Campañas       -> creadas: ${resumenCampanias.creadas}, omitidas: ${resumenCampanias.omitidas}`);
  console.log(`  Usuarios       -> creados: ${resumenUsuarios.creadas}, omitidos: ${resumenUsuarios.omitidas}`);
}

try {
  await main();
} catch (err) {
  console.error(`Error al cargar los datos: ${err.message}`);
  process.exitCode = 1;
} finally {
  // Sin desconectar, el proceso quedaría abierto esperando a la base.
  await mongoose.disconnect();
}
