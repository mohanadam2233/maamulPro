import mongoose from 'mongoose';

const tenantSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
  email: { type: String, required: true, lowercase: true, trim: true },
  phone: { type: String, trim: true },
  currency: { type: String, default: 'USD', uppercase: true },
  timezone: { type: String, default: 'Africa/Mogadishu' },
  status: {
    type: String,
    enum: ['PENDING_APPROVAL', 'ACTIVE', 'PAST_DUE', 'SUSPENDED', 'ARCHIVED', 'DELETION_SCHEDULED'],
    default: 'PENDING_APPROVAL',
    index: true,
  },
  deletionScheduledAt: Date,
}, { timestamps: true });

export default mongoose.model('Tenant', tenantSchema);
