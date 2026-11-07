import mongoose from "mongoose";

/**
 * CONTADORES CORRELATIVOS (colección "counters")
 * Un documento por numeración, por ejemplo { _id: "certificados", seq: 12 }.
 * siguiente() incrementa y devuelve el número en una sola operación atómica de
 * MongoDB ($inc): dos pedidos simultáneos nunca reciben el mismo número.
 */
const counterSchema = new mongoose.Schema(
  {
    _id: { type: String },
    seq: { type: Number, default: 0 }
  },
  { versionKey: false }
);

counterSchema.statics.siguiente = async function (nombre) {
  const contador = await this.findOneAndUpdate(
    { _id: nombre },
    { $inc: { seq: 1 } },
    { upsert: true, returnDocument: "after" }
  );
  return contador.seq;
};

const Counter = mongoose.model("Counter", counterSchema);

export default Counter;
