import mongoose from 'mongoose';

const itemSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  name: { type: String, required: true },
  quantity: { type: Number, required: true, min: 1 },
  unitPriceMinor: { type: Number, required: true, min: 0 },
  costMinor: { type: Number, min: 0, default: 0 },
  lineTotalMinor: { type: Number, required: true, min: 0 },
}, { _id: false });

const saleSchema = new mongoose.Schema({
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
  invoiceNumber: { type: String, required: true },
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', default: null },
  items: { type: [itemSchema], validate: (value) => value.length > 0 },
  subtotalMinor: { type: Number, required: true },
  discountMinor: { type: Number, min: 0, default: 0 },
  totalMinor: { type: Number, required: true },
  paidMinor: { type: Number, required: true, min: 0 },
  status: { type: String, enum: ['PAID', 'PARTIAL', 'UNPAID'], required: true, index: true },
  paymentMethod: { type: String, default: 'Cash' },
  referenceNumber: { type: String, trim: true, default: '' },
  invoiceDate: { type: Date, default: Date.now, index: true },
  taxRateBps: { type: Number, min: 0, max: 10000, default: 0 },
  taxMinor: { type: Number, min: 0, default: 0 },
  note: { type: String, trim: true, maxlength: 1000, default: '' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

saleSchema.index({ tenantId: 1, invoiceNumber: 1 }, { unique: true });
saleSchema.index({ tenantId: 1, createdAt: -1 });
saleSchema.index(
  { tenantId: 1, referenceNumber: 1 },
  { unique: true, partialFilterExpression: { referenceNumber: { $type: 'string', $gt: '' } } },
);
export default mongoose.model('Sale', saleSchema);
