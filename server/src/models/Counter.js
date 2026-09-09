import mongoose from 'mongoose';

const counterSchema = new mongoose.Schema({
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
  name: { type: String, required: true },
  value: { type: Number, default: 0 },
});

counterSchema.index({ tenantId: 1, name: 1 }, { unique: true });
export default mongoose.model('Counter', counterSchema);
