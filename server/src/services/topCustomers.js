import mongoose from 'mongoose';
import Sale from '../models/Sale.js';

// All-time invoice value, including paid and outstanding sales. Anonymous
// walk-in sales cannot be attributed to an individual customer.
export function getTopCustomers(tenantId) {
  return Sale.aggregate([
    { $match: { tenantId: new mongoose.Types.ObjectId(tenantId), customerId: { $ne: null } } },
    { $group: { _id: '$customerId', totalMinor: { $sum: '$totalMinor' } } },
    { $lookup: { from: 'customers', localField: '_id', foreignField: '_id', as: 'customer' } },
    { $unwind: '$customer' },
    { $match: { 'customer.tenantId': new mongoose.Types.ObjectId(tenantId), 'customer.isActive': { $ne: false } } },
    { $sort: { totalMinor: -1, 'customer.name': 1, _id: 1 } },
    { $limit: 10 },
    { $project: { name: '$customer.name', phone: '$customer.phone', address: '$customer.address', totalMinor: 1 } },
  ]);
}
