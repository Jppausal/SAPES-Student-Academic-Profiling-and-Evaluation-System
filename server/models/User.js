const mongoose = require('mongoose');
const accountSchema = require('./accountSchema');

module.exports = mongoose.models.User
  || mongoose.model('User', accountSchema, 'users');
