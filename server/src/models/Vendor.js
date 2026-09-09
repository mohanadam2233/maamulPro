import mongoose from 'mongoose';

const vendorSchema = new mongoose.Schema({
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
  name: { type: String, required: true, trim: true },
  phone: String,
  email: { type: String, lowercase: true, trim: true },
  address: String,
  balanceMinor: { type: Number, min: 0, default: 0 },
  openedAt: { type: Date, default: Date.now },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

export default mongoose.model('Vendor', vendorSchema);
