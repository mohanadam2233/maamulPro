import { AppError } from '../utils/AppError.js';

export function calculatePurchaseTotals(lines, discountMinor, paidMinor) {
  const subtotalMinor = lines.reduce((sum, line) => sum + line.lineTotalMinor, 0);
  if (discountMinor > subtotalMinor) {
    throw new AppError(422, 'Discount exceeds purchase subtotal', 'INVALID_DISCOUNT');
  }
  const totalMinor = subtotalMinor - discountMinor;
  if (paidMinor > totalMinor) {
    throw new AppError(422, 'Paid amount exceeds purchase total', 'INVALID_PAYMENT');
  }
  return { subtotalMinor, totalMinor, balanceMinor: totalMinor - paidMinor };
}

export function validateSettlement(balanceMinor, amountMinor, discountMinor, label) {
  const settlementMinor = amountMinor + discountMinor;
  if (settlementMinor > balanceMinor) {
    throw new AppError(422, `${label} payment and discount exceed the outstanding balance`, 'PAYMENT_EXCEEDS_BALANCE');
  }
  return { settlementMinor, remainingMinor: balanceMinor - settlementMinor };
}
