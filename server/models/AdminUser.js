const mongoose = require('mongoose');
const accountSchema = require('./accountSchema');

module.exports = mongoose.models.AdminUser
  || mongoose.model('AdminUser', accountSchema, 'admin users');
