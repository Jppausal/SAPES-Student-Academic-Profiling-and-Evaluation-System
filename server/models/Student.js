const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema(
  {
    institutionId: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },

    username: {
      type: String,
      trim: true,
      lowercase: true,
      unique: true,
      sparse: true
    },

    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: ''
    },

    firstName: {
      type: String,
      trim: true,
      default: ''
    },

    lastName: {
      type: String,
      trim: true,
      default: ''
    },

    passwordHash: {
      type: String,
      trim: true,
      default: '',
      select: false
    },

    googleId: {
      type: String,
      unique: true,
      sparse: true,
      trim: true
    },

    passwordResetCodeHash: { type: String, select: false },
    passwordResetExpiresAt: { type: Date, select: false },
    passwordResetAttempts: { type: Number, default: 0, select: false },
    passwordResetRequestedAt: { type: Date, select: false },
    notificationPreferences: {
      profileAndAcademicUpdates: { type: Boolean, default: true },
      emailAlerts: { type: Boolean, default: true },
      securityAlerts: { type: Boolean, default: true }
    },

    role: {
      type: String,
      enum: ['student', 'faculty', 'admin'],
      default: 'student'
    },

    accountStatus: {
      type: String,
      enum: ['active', 'inactive', 'suspended'],
      default: 'active'
    },

    yearLevel: {
      type: Number,
      min: 1,
      max: 6
    },

    section: {
      type: String,
      trim: true,
      maxlength: 30
    },

    enrollmentStatus: {
      type: String,
      enum: ['enrolled', 'not_enrolled', 'processing'],
      default: 'not_enrolled'
    },

    lastLoginAt: {
      type: Date,
      default: null
    },

    personalInformation: {
      firstName: {
        type: String,
        required: true,
        trim: true
      },

      middleName: { 
      },

      lastName: {
        type: String,
        required: true,
        trim: true
      },

      suffix: String,

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
      program: {
        type: String,
        trim: true
      },

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
      presentAddress: { street: String, barangay: String, municipality: String, province: String, region: String, country: String, zipCode: String },
      homeAddress: { street: String, barangay: String, municipality: String, province: String, region: String, country: String, zipCode: String }
    },

    educationalBackground: {
      previousSchool: String, seniorHigh: String, juniorHigh: String, elementary: String
    },

    religiousInformation: {
      religion: String,
      shareSpiritualSchedule: { type: Boolean, default: false },
      spiritualActivities: [{ dayOfWeek: String, startTime: String, endTime: String, _id: false }]
    },

    healthInformation: {
      hasRelevantHealthConcern: { type: Boolean, default: false },
      conditions: { type: [String], default: [] },
      otherCondition: String,
      allergyDetails: String,
      conditionDescription: String,
      accommodationRequired: { type: Boolean, default: false },
      accommodationNotes: String,
      physicalActivityClearance: {
        type: String,
        enum: ['can_attend_all', 'restricted', 'cannot_attend', 'none', ''],
        default: 'none'
      },
      assistanceNeeds: { type: [String], default: [] },
      otherAssistanceDetails: String,
      medicalCertificate: {
        fileName: String,
        fileData: String,
        fileType: String,
        fileSize: Number,
        uploadedAt: { type: Date, default: Date.now }
      },
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
  collection: 'student users'
}
);

studentSchema.pre('save', function (next) {
  if (this.personalInformation?.firstName) {
    this.firstName = this.personalInformation.firstName.trim();
  }
  if (this.personalInformation?.lastName) {
    this.lastName = this.personalInformation.lastName.trim();
  }
  if (typeof next === 'function') {
    next();
  }
});

module.exports = mongoose.model('Student', studentSchema);
