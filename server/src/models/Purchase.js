import mongoose from 'mongoose';

const purchaseItemSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  name: { type: String, required: true },
  quantity: { type: Number, required: true, min: 1 },
  unitCostMinor: { type: Number, required: true, min: 0 },
  lineTotalMinor: { type: Number, required: true, min: 0 },
}, { _id: false });

const purchaseSchema = new mongoose.Schema({
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
  purchaseNumber: { type: String, required: true },
  vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', required: true },
  items: { type: [purchaseItemSchema], validate: (items) => items.length > 0 },
  totalMinor: { type: Number, required: true, min: 0 },
  subtotalMinor: { type: Number, required: true, min: 0 },
  discountMinor: { type: Number, min: 0, default: 0 },
  paidMinor: { type: Number, required: true, min: 0 },
  status: { type: String, enum: ['PAID', 'PARTIAL', 'UNPAID'], required: true },
  purchaseDate: { type: Date, default: Date.now, index: true },
  referenceNumber: { type: String, trim: true, default: '' },
  paymentMethod: { type: String, trim: true, default: 'Cash' },
  note: { type: String, trim: true, maxlength: 1000, default: '' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

purchaseSchema.index({ tenantId: 1, purchaseNumber: 1 }, { unique: true });
purchaseSchema.index({ tenantId: 1, createdAt: -1 });
purchaseSchema.index(
  { tenantId: 1, referenceNumber: 1 },
  { unique: true, partialFilterExpression: { referenceNumber: { $type: 'string', $gt: '' } } },
);
export default mongoose.model('Purchase', purchaseSchema);
