import mongoose from 'mongoose';

const customerSchema = new mongoose.Schema({
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
  name: { type: String, required: true, trim: true },
  phone: { type: String, trim: true },
  email: { type: String, lowercase: true, trim: true },
  address: String,
  balanceMinor: { type: Number, min: 0, default: 0 },
  creditLimitMinor: { type: Number, min: 0, default: 0 },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

customerSchema.index({ tenantId: 1, phone: 1 });
export default mongoose.model('Customer', customerSchema);
