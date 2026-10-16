export const COMISION_SUMAR_IMPACTO = 0.035;

export const GASTOS_PROCESAMIENTO = {
  transferencia: 0.01218,
  debito: 0.01218,
  credito: 0.02428
};

export const MEDIOS_PAGO = ["transferencia", "debito", "credito"];

export function redondearDosDecimales(numero) {
  return Math.round((numero + Number.EPSILON) * 100) / 100;
}
