import mongoose from 'mongoose';

const expenseSchema = new mongoose.Schema({
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
  category: { type: String, required: true, trim: true },
  description: { type: String, required: true, trim: true },
  amountMinor: { type: Number, required: true, min: 1 },
  currency: { type: String, default: 'USD' },
  paidAt: { type: Date, default: Date.now, index: true },
  method: { type: String, default: 'Cash' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

expenseSchema.index({ tenantId: 1, paidAt: -1 });
export default mongoose.model('Expense', expenseSchema);
