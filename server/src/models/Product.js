import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
  name: { type: String, required: true, trim: true },
  sku: { type: String, required: true, trim: true },
  barcode: { type: String, required: true, trim: true },
  category: { type: String, default: 'General' },
  unit: { type: String, default: 'Piece', trim: true },
  costMinor: { type: Number, min: 0, default: 0 },
  priceMinor: { type: Number, min: 0, required: true },
  stock: { type: Number, min: 0, default: 0 },
  minimumStock: { type: Number, min: 0, default: 5 },
  expiresAt: { type: Date, default: null },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

productSchema.index({ tenantId: 1, sku: 1 }, { unique: true });
productSchema.index({ tenantId: 1, barcode: 1 }, { unique: true, partialFilterExpression: { barcode: { $type: 'string', $gt: '' } } });
productSchema.index({ tenantId: 1, name: 'text', sku: 'text', barcode: 'text' });
export default mongoose.model('Product', productSchema);
