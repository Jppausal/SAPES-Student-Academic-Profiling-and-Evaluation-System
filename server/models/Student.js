const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true
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

      height: String,
      weight: String,
      bloodType: String,

      nationality: String,

      citizenship: String,

      dualCitizenship: String,
      minority: String,

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

      isShifter: {
        type: Boolean,
        default: false
      },

      isTransferee: {
        type: Boolean,
        default: false
      },

      indigenousGroup: String
    },

    enrollmentInformation: {
      course: String, level: String, department: String, curriculum: String, yearLevel: String,
      entryPeriod: String, entryDate: Date, studentType: String, preferredModality: String,
      campus: String, learnerReferenceNo: String, nstpNumber: String
    },

    contactInformation: {
      mobileNumber: String, alternateMobileNumber: String, telephoneNumber: String,
      institutionalEmail: String, alternateEmail: String
    },

    addresses: {
      presentAddress: { street: String, barangay: String, municipality: String, province: String, zipCode: String },
      homeAddress: { street: String, barangay: String, municipality: String, province: String, zipCode: String }
    },

    educationalBackground: {
      previousSchool: String, seniorHigh: String, juniorHigh: String, elementary: String
    },

    religiousInformation: {
      religion: String
    },

    healthInformation: {
      hasRelevantHealthConcern: { type: Boolean, default: false },
      conditions: { type: [String], default: [] },
      otherCondition: String,
      allergyDetails: String,
      conditionDescription: String,
      accommodationRequired: { type: Boolean, default: false },
      accommodationNotes: String,
      emergencyContactName: String,
      emergencyContactNumber: String,
      lastUpdated: Date
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
