const mongoose = require('mongoose');
const AuditLog = require('../models/AuditLog');
const { getAccountModelName } = require('./accountCollections');

/**
 * Safely records an audit log entry in MongoDB without interrupting caller execution on error.
 */
async function recordAuditLog({
  userId,
  userRole,
  userModel,
  action,
  targetType = 'account',
  targetId = null,
  details = {}
}) {
  try {
    if (!userId || !userRole || !action) {
      return null;
    }

    const resolvedModel = userModel || getAccountModelName(userRole);
    if (!resolvedModel) {
      return null;
    }

    const safeUserId = mongoose.isValidObjectId(userId) ? userId : null;
    const safeTargetId = mongoose.isValidObjectId(targetId) ? targetId : safeUserId;

    if (!safeUserId) {
      return null;
    }

    return await AuditLog.create({
      userId: safeUserId,
      userRole,
      userModel: resolvedModel,
      action: String(action).trim(),
      targetType: String(targetType).trim(),
      targetId: safeTargetId,
      details: details || {}
    });
  } catch (error) {
    console.error('AuditLog recording error (non-fatal):', error.message);
    return null;
  }
}

module.exports = {
  recordAuditLog
};
