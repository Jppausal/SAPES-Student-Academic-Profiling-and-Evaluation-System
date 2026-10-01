const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      unique: true,
      sparse: true
    },

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

    passwordHash: {
      type: String,
      trim: true,
      default: ''
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
