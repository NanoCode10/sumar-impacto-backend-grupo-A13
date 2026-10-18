import Donation from "../models/Donation.js";
import { MEDIOS_PAGO } from "../config/parametros.js";

async function getDonations(req, res, next) {
  try {
    const donations = await Donation.buscarTodas(req.filtros);
    res.status(200).json(donations);
  } catch (err) {
    next(err);
  }
}

async function getDonationById(req, res, next) {
  try {
    const donation = await Donation.findById(req.params.id);
    if (!donation) {
      return res.status(404).json({ error: "Donación no encontrada" });
    }
    res.status(200).json(donation);
  } catch (err) {
    next(err);
  }
}

async function createDonation(req, res, next) {
  try {
    const { donorId, campaignId, grossAmount, paymentMethod } = req.body;
    const donation = await Donation.crear({ donorId, campaignId, grossAmount, paymentMethod });
    res.status(201).json(donation);
  } catch (err) {
    next(err);
  }
}

async function updateDonation(req, res, next) {
  try {
    const { donorId, campaignId, grossAmount, paymentMethod } = req.body;
    const donation = await Donation.actualizar(req.params.id, { donorId, campaignId, grossAmount, paymentMethod });
    if (!donation) {
      return res.status(404).json({ error: "Donación no encontrada" });
    }
    res.status(200).json(donation);
  } catch (err) {
    next(err);
  }
}

async function deleteDonation(req, res, next) {
  try {
    const donation = await Donation.anular(req.params.id);
    if (!donation) {
      return res.status(404).json({ error: "Donación no encontrada" });
    }
    res.status(200).json({ message: "Donación anulada correctamente", donation });
  } catch (err) {
    next(err);
  }
}

function renderDonations(req, res) {
  res.render("donations", {
    title: "Donaciones - SumarImpacto",
    paymentMethods: MEDIOS_PAGO
  });
}

export { getDonations, getDonationById, createDonation, updateDonation, deleteDonation, renderDonations };
