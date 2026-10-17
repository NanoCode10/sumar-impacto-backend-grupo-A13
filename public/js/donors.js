const API = "/api/donors";

const tbody = document.getElementById("donor-tbody");

async function cargarDonantes() {
  try {
    const donantes = await pedir(API);

    if (donantes.length === 0) {
      filaUnica(tbody, "Sin donantes registrados.", 6);
      return;
    }

    const filas = donantes.map((donor) => {
      const tr = document.createElement("tr");
      tr.append(
        celda(donor.name),
        celda(donor.type),
        celda(donor.document),
        celda(donor.email),
        celda(donor.isMember ? "Sí" : "No"),
        celdaBadge(donor.status)
      );
      return tr;
    });

    tbody.replaceChildren(...filas);
  } catch (err) {
    filaUnica(tbody, `No se pudo cargar el listado: ${err.message}`, 6);
  }
}

cargarDonantes();