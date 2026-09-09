import test from 'node:test';
import assert from 'node:assert/strict';
import { allowRoles } from '../src/middleware/auth.js';

test('role guard permits approved roles', () => {
  let passed = false;
  allowRoles('BUSINESS_ADMIN', 'CASHIER')({ user: { role: 'CASHIER' } }, {}, (error) => { assert.equal(error, undefined); passed = true; });
  assert.equal(passed, true);
});

test('role guard rejects an auditor from protected writes', () => {
  allowRoles('BUSINESS_ADMIN', 'CASHIER')({ user: { role: 'AUDITOR' } }, {}, (error) => {
    assert.equal(error.status, 403);
    assert.equal(error.code, 'FORBIDDEN');
  });
});
