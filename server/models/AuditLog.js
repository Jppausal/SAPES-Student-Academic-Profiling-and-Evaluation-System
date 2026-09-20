const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },

    action: {
      type: String,
      required: true,
      trim: true
    },

    targetType: {
      type: String,
      required: true,
      trim: true
    },

    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null
    },

    timestamp: {
      type: Date,
      default: Date.now
    },

    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },
  {
    collection: 'audit_logs'
  }
);

module.exports = mongoose.model('AuditLog', auditLogSchema);