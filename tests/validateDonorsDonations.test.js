import { test } from "node:test";
import assert from "node:assert/strict";

import { validateDonor, validateDonation } from "../middlewares/validateBody.js";
import { validateDonorQuery, validateDonationQuery } from "../middlewares/validateQuery.js";

function ejecutarValidador(validador, entrada, modo) {
  const req = modo === "query" ? { query: entrada } : { body: entrada };
  let respuesta;
  let siguienteLlamado = false;
  const res = {
    status(codigo) {
      respuesta = { codigo };
      return this;
    },
    json(data) {
      respuesta.body = data;
      return this;
    }
  };

  validador(req, res, () => {
    siguienteLlamado = true;
  });
  return { req, respuesta, siguienteLlamado };
}

const DONOR_ID = "64b7f0c2a1b2c3d4e5f60718";
const CAMPAIGN_ID = "64b7f0c2a1b2c3d4e5f60719";

test("validateDonor normaliza los campos y acepta booleanos", () => {
  const entrada = {
    name: "  Empresa Solidaria  ",
    type: "CORPORATIVO",
    document: "  30712345678 ",
    email: " rse@solidaria.org ",
    isMember: true
  };
  const resultado = ejecutarValidador(validateDonor("create"), entrada);

  assert.equal(resultado.siguienteLlamado, true);
  assert.equal(resultado.req.body.name, "Empresa Solidaria");
  assert.equal(resultado.req.body.type, "corporativo");
  assert.equal(resultado.req.body.document, "30712345678");
  assert.equal(resultado.req.body.email, "rse@solidaria.org");
});

test("validateDonor rechaza tipos incorrectos y datos incompletos", () => {
  const incompleto = ejecutarValidador(validateDonor("create"), { name: "Empresa Solidaria" });
  assert.equal(incompleto.respuesta.codigo, 400);
  assert.equal(incompleto.siguienteLlamado, false);

  const booleanoTexto = ejecutarValidador(
    validateDonor("create"),
    { name: "Empresa Solidaria", type: "corporativo", document: "123", email: "a@b.org", isMember: "true" }
  );
  assert.equal(booleanoTexto.respuesta.body.error, "isMember debe ser un booleano");

  const tipoInvalido = ejecutarValidador(
    validateDonor("create"),
    { name: "Empresa Solidaria", type: "ong", document: "123", email: "a@b.org" }
  );
  assert.match(tipoInvalido.respuesta.body.error, /type inválido/);
});

test("validateDonation normaliza medio de pago y no valida campos financieros calculados enviados", () => {
  const entrada = {
    donorId: DONOR_ID,
    campaignId: CAMPAIGN_ID,
    grossAmount: 100000,
    paymentMethod: "TRANSFERENCIA",
    commission: "dato que no controla el cliente"
  };
  const resultado = ejecutarValidador(validateDonation("create"), entrada);

  assert.equal(resultado.siguienteLlamado, true);
  assert.equal(resultado.req.body.paymentMethod, "transferencia");
});

test("validateDonation rechaza ids, monto y medio de pago inválidos", () => {
  const entradas = [
    { donorId: "mal", campaignId: CAMPAIGN_ID, grossAmount: 10, paymentMethod: "debito" },
    { donorId: DONOR_ID, campaignId: CAMPAIGN_ID, grossAmount: "10", paymentMethod: "debito" },
    { donorId: DONOR_ID, campaignId: CAMPAIGN_ID, grossAmount: 0, paymentMethod: "debito" },
    { donorId: DONOR_ID, campaignId: CAMPAIGN_ID, grossAmount: 10, paymentMethod: "efectivo" }
  ];

  for (const entrada of entradas) {
    const resultado = ejecutarValidador(validateDonation("create"), entrada);
    assert.equal(resultado.respuesta.codigo, 400);
    assert.equal(resultado.siguienteLlamado, false);
  }
});

test("validateDonorQuery y validateDonationQuery canonicalizan y validan filtros", () => {
  const donor = ejecutarValidador(validateDonorQuery, { type: "INDIVIDUAL", status: "ACTIVO" }, "query");
  assert.equal(donor.siguienteLlamado, true);
  assert.deepEqual(donor.req.filtros, { type: "individual", status: "activo" });

  const donation = ejecutarValidador(
    validateDonationQuery,
    { donorId: DONOR_ID, campaignId: CAMPAIGN_ID, paymentMethod: "CREDITO", status: "ACREDITADA" },
    "query"
  );
  assert.equal(donation.siguienteLlamado, true);
  assert.deepEqual(donation.req.filtros, {
    donorId: DONOR_ID,
    campaignId: CAMPAIGN_ID,
    paymentMethod: "credito",
    status: "acreditada"
  });

  const invalido = ejecutarValidador(validateDonationQuery, { donorId: "abc" }, "query");
  assert.equal(invalido.respuesta.codigo, 400);
});
