const mongoose = require('mongoose');
const accountSchema = require('./accountSchema');

const facultyAccountSchema = accountSchema.clone();
facultyAccountSchema.add({
  designation: {
    type: String,
    default: 'Verified enrollment officer',
    trim: true
  },
  departmentCode: {
    type: String,
    enum: ['IT', 'EMC', 'ELECTRONICS', 'FOODTECH', 'AUTOMOTIVE'],
    uppercase: true,
    trim: true,
    default: ''
  },
  isVerifiedEnrollmentOfficer: {
    type: Boolean,
    default: false
  }
});

module.exports = mongoose.models.FacultyUser
  || mongoose.model('FacultyUser', facultyAccountSchema, 'faculty users');
