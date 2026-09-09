import test from 'node:test';
import assert from 'node:assert/strict';
import { calculatePurchaseTotals, validateSettlement } from '../src/services/purchase.js';

test('purchase totals calculate subtotal, discount and outstanding balance', () => {
  assert.deepEqual(
    calculatePurchaseTotals([{ lineTotalMinor: 1200 }, { lineTotalMinor: 800 }], 100, 500),
    { subtotalMinor: 2000, totalMinor: 1900, balanceMinor: 1400 },
  );
});

test('purchase rejects payment greater than its discounted total', () => {
  assert.throws(
    () => calculatePurchaseTotals([{ lineTotalMinor: 1000 }], 200, 801),
    (error) => error.code === 'INVALID_PAYMENT',
  );
});

test('settlement returns remaining balance and rejects overpayment', () => {
  assert.deepEqual(validateSettlement(1000, 700, 100, 'Supplier'), { settlementMinor: 800, remainingMinor: 200 });
  assert.throws(
    () => validateSettlement(1000, 950, 51, 'Supplier'),
    (error) => error.code === 'PAYMENT_EXCEEDS_BALANCE',
  );
});
