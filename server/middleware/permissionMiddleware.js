const RolePermission = require('../models/RolePermission');

const DEFAULT_PERMISSIONS = {
  student: ['view_own_profile', 'edit_own_profile', 'view_own_academic_record'],
  faculty: ['view_student_records', 'submit_evaluations'],
  admin: ['manage_users', 'manage_academic_records', 'view_reports', 'view_audit_logs']
};

const authorizePermission = (permission) => async (req, res, next) => {
  try {
    const rolePermissions = await RolePermission.findOne({ role: req.user?.role }).lean();
    const permissions = rolePermissions?.permissions || DEFAULT_PERMISSIONS[req.user?.role] || [];

    if (!permissions.includes(permission)) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions'
      });
    }

    return next();
  } catch (error) {
    console.error('Permission check error:', error);
    return res.status(500).json({ success: false, message: 'Unable to verify permissions' });
  }
};

const authorizeAnyPermission = (...permissionsToCheck) => async (req, res, next) => {
  try {
    const rolePermissions = await RolePermission.findOne({ role: req.user?.role }).lean();
    const permissions = rolePermissions?.permissions || DEFAULT_PERMISSIONS[req.user?.role] || [];

    if (!permissionsToCheck.some((permission) => permissions.includes(permission))) {
      return res.status(403).json({ success: false, message: 'Insufficient permissions' });
    }

    return next();
  } catch (error) {
    console.error('Permission check error:', error);
    return res.status(500).json({ success: false, message: 'Unable to verify permissions' });
  }
};

module.exports = { authorizePermission, authorizeAnyPermission, DEFAULT_PERMISSIONS };
