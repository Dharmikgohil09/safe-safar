const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [50, 'Name cannot exceed 50 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    phone: {
      type: String,
      sparse: true,
      unique: true,
      trim: true,
      index: true,
    },
    passwordHash: {
      type: String,
      select: false,
    },
    googleId: {
      type: String,
      sparse: true,
      unique: true,
      index: true,
    },
    authProvider: {
      type: String,
      enum: ['local', 'google'],
      default: 'local',
    },
    avatar: {
      type: String,
      default: '',
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
      index: true,
    },
    emailVerificationTokenHash: {
      type: String,
      select: false,
    },
    emailVerificationExpires: {
      type: Date,
      select: false,
    },
    refreshTokenHash: {
      type: [String],
      select: false,
      default: [],
    },
    failedLoginAttempts: {
      type: Number,
      default: 0,
    },
    lockUntil: {
      type: Date,
      default: null,
    },
    trustedContacts: {
      type: Array,
      default: [],
    },
    emergencyNote: {
      type: String,
      default: '',
      maxlength: [500, 'Emergency note cannot exceed 500 characters'],
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (doc, ret) => {
        delete ret.passwordHash;
        delete ret.emailVerificationTokenHash;
        delete ret.emailVerificationExpires;
        delete ret.refreshTokenHash;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Helper method to check if the account is currently locked
userSchema.methods.isLocked = function () {
  return !!(this.lockUntil && this.lockUntil > Date.now());
};

const User = mongoose.models.User || mongoose.model('User', userSchema);

module.exports = User;
