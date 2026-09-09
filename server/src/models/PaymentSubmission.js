import mongoose from 'mongoose';

const paymentSubmissionSchema = new mongoose.Schema({
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
  amountMinor: { type: Number, required: true, min: 1 },
  currency: { type: String, default: 'USD', uppercase: true },
  billingMonths: { type: Number, default: 1, min: 1, max: 24 },
  method: { type: String, required: true, trim: true },
  reference: { type: String, required: true, trim: true },
  evidenceUrl: String,
  notes: String,
  status: {
    type: String,
    enum: ['PENDING_REVIEW', 'APPROVED', 'REJECTED', 'CORRECTION_REQUIRED'],
    default: 'PENDING_REVIEW',
    index: true,
  },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reviewedAt: Date,
  decisionReason: String,
}, { timestamps: true });

paymentSubmissionSchema.index({ tenantId: 1, reference: 1 }, { unique: true });
export default mongoose.model('PaymentSubmission', paymentSubmissionSchema);
