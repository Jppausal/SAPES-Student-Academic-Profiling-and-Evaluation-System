const mongoose = require('mongoose');

const credentialMfaTokenSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AdminUser',
      required: true
    },
    integration: {
      type: String,
      required: true,
      enum: ['googleAuth', 'recaptcha', 'passwordGenerator', 'smtp']
    },
    codeHash: {
      type: String,
      required: true
    },
    recipientEmail: {
      type: String,
      required: true,
      trim: true
    },
    attempts: {
      type: Number,
      default: 0
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 } // TTL index: MongoDB automatically removes expired docs
    }
  },
  { timestamps: true, collection: 'credential_mfa_tokens' }
);

module.exports =
  mongoose.models.CredentialMfaToken ||
  mongoose.model('CredentialMfaToken', credentialMfaTokenSchema);
