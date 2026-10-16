import Donor from "../models/Donor.js";

async function getDonors(req, res, next) {
  try {
    const donors = await Donor.buscarTodos(req.filtros);
    res.status(200).json(donors);
  } catch (err) {
    next(err);
  }
}

async function getDonorById(req, res, next) {
  try {
    const donor = await Donor.findById(req.params.id);
    if (!donor) {
      return res.status(404).json({ error: "Donante no encontrado" });
    }
    res.status(200).json(donor);
  } catch (err) {
    next(err);
  }
}

async function createDonor(req, res, next) {
  try {
    const { name, type, document, email, isMember, status } = req.body;
    const donor = await Donor.crear({ name, type, document, email, isMember, status });
    res.status(201).json(donor);
  } catch (err) {
    next(err);
  }
}

async function updateDonor(req, res, next) {
  try {
    const { name, type, document, email, isMember, status } = req.body;
    const donor = await Donor.actualizar(req.params.id, { name, type, document, email, isMember, status });
    if (!donor) {
      return res.status(404).json({ error: "Donante no encontrado" });
    }
    res.status(200).json(donor);
  } catch (err) {
    next(err);
  }
}

async function deleteDonor(req, res, next) {
  try {
    const donor = await Donor.eliminar(req.params.id);
    if (!donor) {
      return res.status(404).json({ error: "Donante no encontrado" });
    }
    res.status(200).json({ message: "Donante eliminado correctamente", donor });
  } catch (err) {
    next(err);
  }
}

export { getDonors, getDonorById, createDonor, updateDonor, deleteDonor };
