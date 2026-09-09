import mongoose from 'mongoose';

const subscriptionSchema = new mongoose.Schema({
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, unique: true },
  plan: { type: String, default: 'STANDARD' },
  status: {
    type: String,
    enum: ['TRIALING', 'PENDING_PAYMENT', 'ACTIVE', 'PAST_DUE', 'SUSPENDED', 'CANCELLED', 'EXPIRED'],
    default: 'PENDING_PAYMENT',
    index: true,
  },
  amountMinor: { type: Number, min: 0, default: 0 },
  currency: { type: String, default: 'USD' },
  startsAt: Date,
  expiresAt: Date,
  graceEndsAt: Date,
}, { timestamps: true });

export default mongoose.model('Subscription', subscriptionSchema);
