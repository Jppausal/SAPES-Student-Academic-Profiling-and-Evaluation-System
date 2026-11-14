const mongoose = require('mongoose');

module.exports = mongoose.model('SystemSettings', new mongoose.Schema({
  _id: { type: String, default: 'system' },
  integrations: {
    googleAuth: {
      enabled: { type: Boolean, default: true },
      customClientId: { type: String, default: '' }
    },
    recaptcha: {
      enabled: { type: Boolean, default: false },
      customSiteKey: { type: String, default: '' },
      customSecretKey: { type: String, default: '' }
    },
    smtp: {
      enabled: { type: Boolean, default: true }
    },
    passwordGenerator: {
      enabled: { type: Boolean, default: true },
      customApiKey: { type: String, default: '' }
    }
  },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'AdminUser' }
}, { timestamps: true, collection: 'system_settings' }));
