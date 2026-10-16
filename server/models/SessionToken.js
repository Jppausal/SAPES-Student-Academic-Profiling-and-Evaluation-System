const mongoose = require('mongoose');

const sessionTokenSchema = new mongoose.Schema(
  {
    jti: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true
    },
    accountRole: {
      type: String,
      enum: ['admin', 'faculty', 'student'],
      required: true
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 }
    },
    revokedAt: {
      type: Date,
      default: null
    }
  },
  { collection: 'session_tokens' }
);

module.exports = mongoose.model('SessionToken', sessionTokenSchema);
