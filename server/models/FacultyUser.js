const mongoose = require('mongoose');
const accountSchema = require('./accountSchema');

const facultyAccountSchema = accountSchema.clone();
facultyAccountSchema.add({
  designation: {
    type: String,
    default: 'Verified enrollment officer',
    trim: true
  }
});

module.exports = mongoose.models.FacultyUser
  || mongoose.model('FacultyUser', facultyAccountSchema, 'faculty users');
