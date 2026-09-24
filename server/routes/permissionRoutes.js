const express = require('express');
const RolePermission = require('../models/RolePermission');
const AuditLog = require('../models/AuditLog');
const authenticateToken = require('../middleware/authMiddleware');
const authorizeRoles = require('../middleware/roleMiddleware');
const { DEFAULT_PERMISSIONS } = require('../middleware/permissionMiddleware');

const router = express.Router();
const roles = ['student', 'faculty', 'admin'];
const availablePermissions = [
  'view_own_profile',
  'edit_own_profile',
  'view_own_academic_record',
  'view_student_records',
  'submit_evaluations',
  'manage_users',
  'manage_academic_records',
  'view_reports',
  'view_audit_logs'
];

const requireAdmin = [authenticateToken, authorizeRoles('admin')];

router.get('/', ...requireAdmin, async (req, res) => {
  try {
    const configured = await RolePermission.find({ role: { $in: roles } }).lean();
    const byRole = new Map(configured.map((item) => [item.role, item.permissions]));
    res.json({
      success: true,
      data: {
        availablePermissions,
        roles: roles.map((role) => ({
          role,
          permissions: byRole.get(role) || DEFAULT_PERMISSIONS[role]
        }))
      }
    });
  } catch (error) {
    console.error('Error fetching role permissions:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.put('/:role', ...requireAdmin, async (req, res) => {
  try {
    const { role } = req.params;
    const { permissions } = req.body || {};
    if (!roles.includes(role)) {
      return res.status(400).json({ success: false, message: 'Invalid role' });
    }
    if (!Array.isArray(permissions) || permissions.some((permission) => !availablePermissions.includes(permission))) {
      return res.status(400).json({ success: false, message: 'Invalid permissions' });
    }
    if (role === 'admin' && !permissions.includes('manage_users')) {
      return res.status(400).json({ success: false, message: 'Administrator role must retain manage_users permission' });
    }

    const rolePermission = await RolePermission.findOneAndUpdate(
      { role },
      { role, permissions: [...new Set(permissions)] },
      { upsert: true, new: true, runValidators: true }
    );

    await AuditLog.create({
      userId: req.user.userId,
      action: 'ROLE_PERMISSIONS_UPDATED',
      targetType: 'role',
      details: { role, permissions: rolePermission.permissions }
    });

    return res.json({ success: true, data: { role, permissions: rolePermission.permissions } });
  } catch (error) {
    console.error('Error updating role permissions:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
