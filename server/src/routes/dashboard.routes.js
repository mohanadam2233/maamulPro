import { Router } from 'express';
import mongoose from 'mongoose';
import Sale from '../models/Sale.js';
import Product from '../models/Product.js';
import Customer from '../models/Customer.js';
import Vendor from '../models/Vendor.js';
import Expense from '../models/Expense.js';
import User from '../models/User.js';
import Purchase from '../models/Purchase.js';
import PaymentTransaction from '../models/PaymentTransaction.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { getTopCustomers } from '../services/topCustomers.js';

const router = Router();

router.get('/', asyncHandler(async (req, res) => {
  const tenantId = new mongoose.Types.ObjectId(req.tenantId);
  const now = new Date();
  const startToday = new Date(now); startToday.setHours(0, 0, 0, 0);
  const startMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 1);

  const [todaySales, monthStatus, expensesToday, expenseTrend, customerCount, vendorCount, productStats, userCount, recentSales, todayPurchases, vendorSummary, receiptsToday, paymentsToday] = await Promise.all([
    Sale.aggregate([{ $match: { tenantId, createdAt: { $gte: startToday } } }, { $group: { _id: null, total: { $sum: '$totalMinor' }, paid: { $sum: '$paidMinor' }, invoices: { $sum: 1 } } }]),
    Sale.aggregate([{ $match: { tenantId, createdAt: { $gte: startMonth } } }, { $group: { _id: '$status', value: { $sum: '$totalMinor' } } }]),
    Expense.aggregate([{ $match: { tenantId, paidAt: { $gte: startToday } } }, { $group: { _id: null, total: { $sum: '$amountMinor' } } }]),
    Expense.aggregate([{ $match: { tenantId, paidAt: { $gte: threeMonthsAgo } } }, { $group: { _id: { year: { $year: '$paidAt' }, month: { $month: '$paidAt' } }, value: { $sum: '$amountMinor' } } }, { $sort: { '_id.year': 1, '_id.month': 1 } }]),
    Customer.countDocuments({ tenantId, isActive: true }),
    Vendor.countDocuments({ tenantId, isActive: true }),
    Product.aggregate([{ $match: { tenantId, isActive: true } }, { $group: { _id: null, products: { $sum: 1 }, units: { $sum: '$stock' }, stockValue: { $sum: { $multiply: ['$stock', '$costMinor'] } } } }]),
    User.countDocuments({ tenantId, isActive: true }),
    Sale.find({ tenantId }).populate('customerId', 'name').sort({ createdAt: -1 }).limit(5).lean(),
    Purchase.aggregate([{ $match: { tenantId, createdAt: { $gte: startToday } } }, { $group: { _id: null, total: { $sum: '$totalMinor' } } }]),
    Purchase.aggregate([{ $match: { tenantId, createdAt: { $gte: startMonth } } }, { $group: { _id: '$status', value: { $sum: '$totalMinor' } } }]),
    PaymentTransaction.aggregate([{ $match: { tenantId, type: 'CUSTOMER_RECEIPT', paymentDate: { $gte: startToday } } }, { $group: { _id: null, total: { $sum: '$amountMinor' } } }]),
    PaymentTransaction.aggregate([{ $match: { tenantId, type: 'SUPPLIER_PAYMENT', paymentDate: { $gte: startToday } } }, { $group: { _id: null, total: { $sum: '$amountMinor' } } }]),
  ]);

  const daily = todaySales[0] || { total: 0, paid: 0, invoices: 0 };
  const topCustomers = await getTopCustomers(req.tenantId);
  res.json({ success: true, data: {
    metrics: {
      dailyInvoice: daily.total, customers: customerCount, purchaseToday: todayPurchases[0]?.total || 0, inventory: productStats[0]?.products  || 0,
      paymentToday: paymentsToday[0]?.total || 0, allExpense: expensesToday[0]?.total || 0, allInvoice: await Sale.countDocuments({ tenantId }),
      vendors: vendorCount, topCustomers: topCustomers.length, receiptToday: receiptsToday[0]?.total || 0, expenseToday: expensesToday[0]?.total || 0, users: userCount,
    },
    salesStatus: ['PAID', 'PARTIAL', 'UNPAID'].map((status) => ({ name: status, value: monthStatus.find((item) => item._id === status)?.value || 0 })),
    vendorSummary: ['PAID', 'PARTIAL', 'UNPAID'].map((status) => ({ name: status[0] + status.slice(1).toLowerCase(), value: vendorSummary.find((item) => item._id === status)?.value || 0 })),
    expenseTrend: expenseTrend.map((item) => ({ name: `${item._id.month}/${item._id.year}`, value: item.value })),
    recentSales,
  } });
}));

export default router;
