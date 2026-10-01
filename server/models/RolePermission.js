const mongoose = require('mongoose');

const rolePermissionSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      enum: ['student', 'faculty', 'admin'],
      required: true,
      unique: true
    },
    permissions: {
      type: [String],
      default: []
    }
  },
  { timestamps: true, collection: 'role_permissions' }
);

module.exports = mongoose.model('RolePermission', rolePermissionSchema);
