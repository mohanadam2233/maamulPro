import mongoose from 'mongoose';

const inventoryOptionSchema = new mongoose.Schema({
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
  type: { type: String, enum: ['CATEGORY', 'UNIT'], required: true },
  name: { type: String, required: true, trim: true },
  isActive: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

inventoryOptionSchema.index({ tenantId: 1, type: 1, name: 1 }, { unique: true });
export default mongoose.model('InventoryOption', inventoryOptionSchema);
