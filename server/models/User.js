const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },

    passwordHash: {
      type: String,
      required: true
    },

    role: {
      type: String,
      enum: ['student', 'faculty', 'admin'],
      required: true
    },

    accountStatus: {
      type: String,
      enum: ['active', 'inactive', 'suspended'],
      default: 'active'
    },

    lastLoginAt: {
      type: Date,
      default: null
    }
  },
  {
  timestamps: true,
  collection: 'users'
  }
);

module.exports = mongoose.model('User', userSchema);