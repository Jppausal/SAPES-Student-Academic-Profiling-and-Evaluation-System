const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },

    institutionId: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },

    personalInformation: {
      firstName: {
        type: String,
        required: true,
        trim: true
      },

      middleName: {
        type: String,
        trim: true
      },

      lastName: {
        type: String,
        required: true,
        trim: true
      },

      birthDate: Date,

      birthPlace: String,

      sex: String,

      civilStatus: String,

      nationality: String,

      citizenship: String,

      isForeigner: {
        type: Boolean,
        default: false
      }
    },

    classification: {
      studentType: String,

      isIP: {
        type: Boolean,
        default: false
      },

      isPWD: {
        type: Boolean,
        default: false
      },

      indigenousGroup: String
    },

    religiousInformation: {
      religion: String
    },

    academicStatus: {
      currentStatus: String,

      isOnProbation: {
        type: Boolean,
        default: false
      },

      probationReason: String,

      statusRemarks: String,

      effectiveDate: Date
    }
  },
  {
  timestamps: true,
  collection: 'students'
}
);

module.exports = mongoose.model('Student', studentSchema);