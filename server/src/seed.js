import mongoose from 'mongoose';
import { connectDatabase } from './config/db.js';
import Tenant from './models/Tenant.js';
import User from './models/User.js';
import Subscription from './models/Subscription.js';
import Product from './models/Product.js';
import Customer from './models/Customer.js';
import Vendor from './models/Vendor.js';
import Expense from './models/Expense.js';

await connectDatabase();
const superEmail = 'owner@maamulpro.com';
const tenantEmail = 'admin@demo.maamulpro.com';
let superAdmin = await User.findOne({ email: superEmail });
if (!superAdmin) superAdmin = await User.create({ name: 'Platform Owner', username: 'superadmin', email: superEmail, password: 'Admin@12345', role: 'SUPER_ADMIN' });

let tenant = await Tenant.findOne({ slug: 'demo-business' });
if (!tenant) tenant = await Tenant.create({ name: 'MaamulPro Demo Business', slug: 'demo-business', email: tenantEmail, phone: '+252 61 0000000', status: 'ACTIVE' });
let admin = await User.findOne({ email: tenantEmail });
if (!admin) admin = await User.create({ tenantId: tenant._id, name: 'Demo Business Admin', username: 'demoadmin', email: tenantEmail, password: 'Demo@12345', role: 'BUSINESS_ADMIN' });

const expiresAt = new Date(); expiresAt.setMonth(expiresAt.getMonth() + 1);
await Subscription.findOneAndUpdate({ tenantId: tenant._id }, { plan: 'STANDARD', status: 'ACTIVE', amountMinor: 3000, currency: 'USD', startsAt: new Date(), expiresAt }, { upsert: true });

if (!(await Product.countDocuments({ tenantId: tenant._id }))) {
  await Product.insertMany([
    { tenantId: tenant._id, name: 'Premium Coffee', sku: 'PC-001', barcode: 'PC-001', category: 'Beverages', unit: 'Pack', costMinor: 450, priceMinor: 700, stock: 84, minimumStock: 10 },
    { tenantId: tenant._id, name: 'Organic Honey', sku: 'OH-002', barcode: 'OH-002', category: 'Food', unit: 'Bottle', costMinor: 600, priceMinor: 950, stock: 48, minimumStock: 8 },
    { tenantId: tenant._id, name: 'Mineral Water', sku: 'MW-003', barcode: 'MW-003', category: 'Beverages', unit: 'Bottle', costMinor: 40, priceMinor: 75, stock: 240, minimumStock: 40 },
  ]);
  await Customer.insertMany([
    { tenantId: tenant._id, name: 'Amina Hassan', phone: '+252 61 1111111', email: 'amina@example.com' },
    { tenantId: tenant._id, name: 'Mohamed Ali', phone: '+252 61 2222222', email: 'mohamed@example.com' },
  ]);
  await Vendor.create({ tenantId: tenant._id, name: 'Horn Trading Co.', phone: '+252 61 3333333', email: 'sales@horn.example' });
  await Expense.create({ tenantId: tenant._id, category: 'Utilities', description: 'Internet service', amountMinor: 6500, createdBy: admin._id });
}

console.log('Seed complete');
console.log('Super Admin: owner@maamulpro.com / Admin@12345');
console.log('Business Admin: admin@demo.maamulpro.com / Demo@12345');
await mongoose.disconnect();
