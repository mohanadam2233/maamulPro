import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', index: true, default: null },
  name: { type: String, required: true, trim: true },
  phone: { type: String, trim: true, default: '' },
  username: { type: String, required: true, unique: true, lowercase: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true, select: false },
  role: {
    type: String,
    enum: ['SUPER_ADMIN', 'BUSINESS_ADMIN', 'BRANCH_MANAGER', 'CASHIER', 'ACCOUNTANT', 'STOREKEEPER', 'AUDITOR'],
    required: true,
    index: true,
  },
  permissions: [{ type: String }],
  isActive: { type: Boolean, default: true },
  tokenVersion: { type: Number, default: 0, select: false },
  lastLoginAt: Date,
}, { timestamps: true });

userSchema.pre('save', async function hashPassword(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.verifyPassword = function verifyPassword(value) {
  return bcrypt.compare(value, this.password);
};

export default mongoose.model('User', userSchema);
