import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateInvoiceTotals, validateCredit } from '../src/services/invoice.js';

test('invoice totals calculate VAT and discount using integer minor units', () => {
  const totals = calculateInvoiceTotals(
    [{ lineTotalMinor: 1000 }, { lineTotalMinor: 500 }],
    500,
    100,
  );
  assert.deepEqual(totals, { subtotalMinor: 1500, taxMinor: 75, totalMinor: 1475 });
});

test('invoice rejects a discount greater than subtotal plus VAT', () => {
  assert.throws(
    () => calculateInvoiceTotals([{ lineTotalMinor: 1000 }], 0, 1001),
    (error) => error.code === 'INVALID_DISCOUNT' && error.status === 422,
  );
});

test('credit sale requires a customer and available credit', () => {
  assert.throws(() => validateCredit(null, 100), (error) => error.code === 'CUSTOMER_REQUIRED');
  assert.throws(
    () => validateCredit({ name: 'Test', balanceMinor: 900, creditLimitMinor: 1000 }, 101),
    (error) => error.code === 'CREDIT_LIMIT_EXCEEDED',
  );
  assert.doesNotThrow(() => validateCredit({ name: 'Test', balanceMinor: 900, creditLimitMinor: 1000 }, 100));
});
