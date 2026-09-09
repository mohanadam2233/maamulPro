import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import Product from '../src/models/Product.js';
import { productRoutes } from '../src/routes/resources.routes.js';

test('stock alerts use tenant scope, minimum stock, and a bounded list with full count', async (t) => {
  const queries = [];
  const query = {
    select() { return this; }, sort() { return this; },
    limit(value) { assert.equal(value, 20); return this; },
    async lean() { return [{ _id: 'p1', name: 'Test', stock: 0, minimumStock: 5 }]; },
  };
  t.mock.method(Product, 'find', (filter) => { queries.push(filter); return query; });
  t.mock.method(Product, 'countDocuments', async (filter) => { queries.push(filter); return 27; });
  const app = express();
  app.use((req, _res, next) => { req.tenantId = 'company-test'; next(); });
  app.use('/products', productRoutes);
  const server = app.listen(0, '127.0.0.1');
  t.after(() => server.close());
  await new Promise((resolve) => server.once('listening', resolve));
  const response = await fetch(`http://127.0.0.1:${server.address().port}/products/alerts`);
  assert.equal(response.status, 200);
  const result = await response.json();
  assert.equal(result.meta.total, 27);
  assert.equal(result.data[0].stock, 0);
  for (const filter of queries) {
    assert.equal(filter.tenantId, 'company-test');
    assert.equal(filter.isActive, true);
    assert.deepEqual(filter.$expr, { $lte: ['$stock', '$minimumStock'] });
  }
});
