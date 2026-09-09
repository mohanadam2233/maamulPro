import mongoose from 'mongoose';

const paymentTransactionSchema = new mongoose.Schema({
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
  paymentNumber: { type: String, required: true },
  type: { type: String, enum: ['CUSTOMER_RECEIPT', 'SUPPLIER_PAYMENT'], required: true, index: true },
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', default: null },
  vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', default: null },
  amountMinor: { type: Number, required: true, min: 1 },
  discountMinor: { type: Number, min: 0, default: 0 },
  reference: { type: String, trim: true, required: true },
  account: { type: String, trim: true, required: true },
  paymentDate: { type: Date, required: true, index: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

paymentTransactionSchema.index({ tenantId: 1, paymentNumber: 1 }, { unique: true });
paymentTransactionSchema.index({ tenantId: 1, type: 1, paymentDate: -1 });
paymentTransactionSchema.index({ tenantId: 1, reference: 1 }, { unique: true });

export default mongoose.model('PaymentTransaction', paymentTransactionSchema);
