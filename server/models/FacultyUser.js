const mongoose = require('mongoose');
const accountSchema = require('./accountSchema');

module.exports = mongoose.models.FacultyUser
  || mongoose.model('FacultyUser', accountSchema, 'faculty users');
