const mongoose = require('mongoose');

module.exports = mongoose.model('SystemSettings', new mongoose.Schema({
  _id: { type: String, default: 'system' },
  integrations: {
    googleAuth: { enabled: { type: Boolean, default: true } },
    recaptcha: { enabled: { type: Boolean, default: false } },
    smtp: { enabled: { type: Boolean, default: true } }
  },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'AdminUser' }
}, { timestamps: true, collection: 'system_settings' }));
