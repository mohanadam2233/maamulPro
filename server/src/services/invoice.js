import { AppError } from '../utils/AppError.js';

export function calculateInvoiceTotals(lines, taxRateBps, discountMinor) {
  const subtotalMinor = lines.reduce((sum, line) => sum + line.lineTotalMinor, 0);
  const taxMinor = Math.round((subtotalMinor * taxRateBps) / 10000);
  const grossMinor = subtotalMinor + taxMinor;

  if (discountMinor > grossMinor) {
    throw new AppError(422, 'Discount exceeds invoice amount', 'INVALID_DISCOUNT');
  }

  return {
    subtotalMinor,
    taxMinor,
    totalMinor: grossMinor - discountMinor,
  };
}

export function validateCredit(customer, balanceDueMinor) {
  if (balanceDueMinor <= 0) return;
  if (!customer) {
    throw new AppError(422, 'Select a customer for a partial or unpaid invoice', 'CUSTOMER_REQUIRED');
  }
  if (customer.balanceMinor + balanceDueMinor > customer.creditLimitMinor) {
    throw new AppError(422, `Credit limit exceeded for ${customer.name}`, 'CREDIT_LIMIT_EXCEEDED');
  }
}
