const crypto = require('node:crypto');
const mongoose = require('mongoose');
const RecordLock = require('../models/RecordLock');
const { recordAuditLog } = require('./auditLogger');
const { parseDeviceInfo } = require('./deviceInfo');

const DEFAULT_LEASE_SECONDS = 120; // 2 minutes default lease
const MAX_LEASE_SECONDS = 600;     // 10 minutes maximum lease

function isLockStorageActive() {
  if (mongoose.connection && mongoose.connection.readyState === 1) {
    return true;
  }
  if (RecordLock.find && (RecordLock.find.mock || RecordLock.findOne?.mock)) {
    return true;
  }
  return false;
}

function getAccountModelName(role) {
  switch (role) {
    case 'admin':
      return 'AdminUser';
    case 'faculty':
      return 'FacultyUser';
    case 'student':
      return 'Student';
    default:
      return 'System';
  }
}

/**
 * Checks the lock compatibility matrix between an existing lock mode and a requested lock mode.
 *
 * Matrix:
 *                 Requested SHARED (S)    Requested EXCLUSIVE (X)
 * Existing None         GRANT                    GRANT
 * Existing SHARED       GRANT                    CONFLICT
 * Existing EXCLUSIVE    CONFLICT                 CONFLICT
 */
function isLockCompatible(existingMode, requestedMode) {
  if (!existingMode) return true;
  if (existingMode === 'SHARED' && requestedMode === 'SHARED') return true;
  return false;
}

/**
 * Cleans expired locks for a given resource.
 */
async function clearExpiredLocks(resourceType, resourceId) {
  if (!isLockStorageActive()) return;
  try {
    const now = new Date();
    await RecordLock.deleteMany({
      resourceType,
      resourceId,
      expiresAt: { $lte: now }
    });
  } catch {
    // Non-fatal
  }
}

/**
 * Acquires a shared or exclusive lock on a resource (Strict 2PL Growing Phase).
 *
 * @param {Object} params
 * @param {string} params.resourceType Resource category ('STUDENT', 'ACADEMIC_RECORD', etc.)
 * @param {string} params.resourceId Resource identifier (e.g. institutionId)
 * @param {'EXCLUSIVE'|'SHARED'} [params.lockMode='EXCLUSIVE'] Lock mode
 * @param {Object} params.user Authenticated user acquiring lock
 * @param {number} [params.durationSeconds=120] Lease duration
 * @param {string} [params.reason] Reason for lock
 * @param {string} [params.transactionId] Optional transaction ID
 * @param {Object} [params.req] Optional Express request for device parsing
 */
async function acquireLock(params) {
  const {
    resourceType = 'STUDENT',
    resourceId,
    lockMode = 'EXCLUSIVE',
    user,
    durationSeconds = DEFAULT_LEASE_SECONDS,
    reason = 'Transaction in progress',
    transactionId = crypto.randomUUID(),
    req = null
  } = params;

  if (!resourceId) {
    throw new Error('resourceId is required to acquire a record lock');
  }
  if (!user || !user.userId) {
    throw new Error('Authenticated user is required to acquire a record lock');
  }
  if (!isLockStorageActive()) {
    return {
      success: false,
      status: 'SERVICE_UNAVAILABLE',
      message: 'Lock storage is currently unavailable'
    };
  }

  const normalizedDuration = Math.min(
    Math.max(Number(durationSeconds) || DEFAULT_LEASE_SECONDS, 10),
    MAX_LEASE_SECONDS
  );
  const now = new Date();
  const expiresAt = new Date(now.getTime() + normalizedDuration * 1000);

  // 1. Remove expired locks first
  await clearExpiredLocks(resourceType, resourceId);

  // 2. Fetch all active locks on this resource
  const activeLocks = await RecordLock.find({
    resourceType,
    resourceId,
    expiresAt: { $gt: now }
  }).lean();

  const userIdStr = String(user.userId);

  // 3. Evaluate compatibility matrix against active locks
  for (const existing of activeLocks) {
    const existingUserIdStr = String(existing.lockedBy?.userId || '');
    const isSameUser = existingUserIdStr === userIdStr;

    // If same user already holds an EXCLUSIVE lock, renew lease
    if (isSameUser && existing.lockMode === 'EXCLUSIVE' && lockMode === 'EXCLUSIVE') {
      await RecordLock.updateOne(
        { _id: existing._id },
        { $set: { expiresAt, reason: reason || existing.reason } }
      );

      return {
        success: true,
        isRenewed: true,
        lockToken: existing.lockToken,
        transactionId: existing.transactionId,
        lockMode: 'EXCLUSIVE',
        resourceType,
        resourceId,
        acquiredAt: existing.acquiredAt,
        expiresAt,
        remainingSeconds: normalizedDuration
      };
    }

    // Check compatibility with other active locks
    if (!isSameUser) {
      const compatible = isLockCompatible(existing.lockMode, lockMode);
      if (!compatible) {
        const remainingSeconds = Math.max(1, Math.ceil((new Date(existing.expiresAt).getTime() - now.getTime()) / 1000));

        // Audit conflict event
        const deviceInfo = req ? parseDeviceInfo(req) : null;
        recordAuditLog({
          userId: user.userId,
          userRole: user.role || 'user',
          userModel: getAccountModelName(user.role),
          action: 'LOCK_CONFLICT',
          targetType: resourceType.toLowerCase(),
          targetId: resourceId,
          details: {
            resourceType,
            resourceId,
            requestedMode: lockMode,
            heldMode: existing.lockMode,
            heldBy: existing.lockedBy?.fullName || existing.lockedBy?.username || 'Another user',
            heldByRole: existing.lockedBy?.role,
            remainingSeconds,
            deviceInfo
          }
        }).catch(() => {});

        return {
          success: false,
          status: 'CONFLICT',
          code: 'CONCURRENCY_LOCK_CONFLICT',
          message: `Record ${resourceId} is currently locked by ${existing.lockedBy?.fullName || existing.lockedBy?.username} (${existing.lockMode} lock). Please wait ${remainingSeconds}s.`,
          conflict: {
            resourceType,
            resourceId,
            lockMode: existing.lockMode,
            lockedBy: existing.lockedBy,
            acquiredAt: existing.acquiredAt,
            expiresAt: existing.expiresAt,
            remainingSeconds,
            reason: existing.reason
          }
        };
      }
    }
  }

  // 4. Compatible: Create the lock record atomically
  const lockToken = crypto.randomUUID();
  const lockDoc = await RecordLock.create({
    resourceType,
    resourceId,
    lockMode,
    lockedBy: {
      userId: user.userId,
      username: user.username || user.institutionId || 'user',
      role: user.role || 'user',
      fullName: user.fullName || user.username || ''
    },
    transactionId,
    lockToken,
    reason,
    acquiredAt: now,
    expiresAt
  });

  // 5. Audit record lock acquisition
  const deviceInfo = req ? parseDeviceInfo(req) : null;
  recordAuditLog({
    userId: user.userId,
    userRole: user.role || 'user',
    userModel: getAccountModelName(user.role),
    action: 'RECORD_LOCKED',
    targetType: resourceType.toLowerCase(),
    targetId: resourceId,
    details: {
      resourceType,
      resourceId,
      lockMode,
      lockToken,
      transactionId,
      leaseSeconds: normalizedDuration,
      reason,
      deviceInfo
    }
  }).catch(() => {});

  return {
    success: true,
    isRenewed: false,
    lockToken,
    transactionId,
    lockMode,
    resourceType,
    resourceId,
    acquiredAt: lockDoc.acquiredAt,
    expiresAt: lockDoc.expiresAt,
    remainingSeconds: normalizedDuration
  };
}

/**
 * Releases a record lock (Strict 2PL Shrinking Phase / Commit).
 *
 * @param {Object} params
 * @param {string} params.resourceType
 * @param {string} params.resourceId
 * @param {string} [params.lockToken] Specific lock token to release
 * @param {Object} params.user User requesting unlock
 * @param {boolean} [params.force=false] Admin force unlock override
 * @param {Object} [params.req] Optional request
 */
async function releaseLock(params) {
  const {
    resourceType = 'STUDENT',
    resourceId,
    lockToken,
    user,
    force = false,
    req = null
  } = params;

  if (!resourceId) return { success: false, message: 'resourceId is required' };
  if (!isLockStorageActive()) return { success: true, message: 'No active lock storage' };

  const query = { resourceType, resourceId };
  if (lockToken) {
    query.lockToken = lockToken;
  } else if (!force && user?.userId) {
    query['lockedBy.userId'] = user.userId;
  }

  const lock = await RecordLock.findOne(query).lean();
  if (!lock) {
    return { success: true, message: 'No active lock to release' };
  }

  // Authorization check (only owner or admin force release)
  const isOwner = String(lock.lockedBy?.userId) === String(user?.userId);
  const isAdmin = user?.role === 'admin';
  if (!isOwner && !isAdmin && !force) {
    return { success: false, message: 'Unauthorized: You do not hold this lock' };
  }

  await RecordLock.deleteOne({ _id: lock._id });

  // Audit lock release
  const deviceInfo = req ? parseDeviceInfo(req) : null;
  recordAuditLog({
    userId: user?.userId || null,
    userRole: user?.role || 'system',
    userModel: getAccountModelName(user?.role),
    action: 'RECORD_UNLOCKED',
    targetType: resourceType.toLowerCase(),
    targetId: resourceId,
    details: {
      resourceType,
      resourceId,
      lockMode: lock.lockMode,
      lockToken: lock.lockToken,
      releasedBy: user?.username || 'user',
      forced: !isOwner && (isAdmin || force),
      deviceInfo
    }
  }).catch(() => {});

  return { success: true, message: 'Lock released successfully' };
}

/**
 * Checks the lock status of a resource.
 */
async function checkLockStatus(resourceType, resourceId, user = null) {
  if (!isLockStorageActive()) {
    return {
      isLocked: false,
      lockMode: null,
      lockedBy: null,
      isOwner: false,
      remainingSeconds: 0
    };
  }
  await clearExpiredLocks(resourceType, resourceId);
  const now = new Date();

  const locks = await RecordLock.find({
    resourceType,
    resourceId,
    expiresAt: { $gt: now }
  }).lean();

  if (!locks || locks.length === 0) {
    return {
      isLocked: false,
      lockMode: null,
      lockedBy: null,
      isOwner: false,
      remainingSeconds: 0
    };
  }

  // Find most restrictive lock (EXCLUSIVE takes precedence)
  const exclusiveLock = locks.find((l) => l.lockMode === 'EXCLUSIVE') || locks[0];
  const userIdStr = String(user?.userId || '');
  const isOwner = Boolean(userIdStr && String(exclusiveLock.lockedBy?.userId) === userIdStr);
  const remainingSeconds = Math.max(1, Math.ceil((new Date(exclusiveLock.expiresAt).getTime() - now.getTime()) / 1000));

  return {
    isLocked: true,
    lockMode: exclusiveLock.lockMode,
    lockedBy: exclusiveLock.lockedBy,
    isOwner,
    lockToken: isOwner ? exclusiveLock.lockToken : undefined,
    transactionId: exclusiveLock.transactionId,
    acquiredAt: exclusiveLock.acquiredAt,
    expiresAt: exclusiveLock.expiresAt,
    remainingSeconds,
    reason: exclusiveLock.reason,
    activeLockCount: locks.length
  };
}

/**
 * Renews / heartbeats an active lock lease.
 */
async function renewLock(params) {
  const { resourceType = 'STUDENT', resourceId, lockToken, durationSeconds = DEFAULT_LEASE_SECONDS } = params;
  if (!lockToken) return { success: false, message: 'lockToken is required' };
  if (!isLockStorageActive()) return { success: false, message: 'Lock storage is currently unavailable' };

  const now = new Date();
  const normalizedDuration = Math.min(Math.max(Number(durationSeconds) || DEFAULT_LEASE_SECONDS, 10), MAX_LEASE_SECONDS);
  const expiresAt = new Date(now.getTime() + normalizedDuration * 1000);

  const updated = await RecordLock.findOneAndUpdate(
    { resourceType, resourceId, lockToken, expiresAt: { $gt: now } },
    { $set: { expiresAt } },
    { returnDocument: 'after' }
  ).lean();

  if (!updated) {
    return { success: false, message: 'Lock not found or has expired' };
  }

  return {
    success: true,
    expiresAt,
    remainingSeconds: normalizedDuration
  };
}

/**
 * Middleware or helper to verify that a write transaction does not violate an active lock.
 * If locked by another user, returns HTTP 423 Locked.
 */
async function verifyLockForWrite(resourceType, resourceId, user, providedLockToken = null) {
  if (!isLockStorageActive()) {
    return { allowed: true };
  }
  const status = await checkLockStatus(resourceType, resourceId, user);
  if (!status.isLocked) {
    return { allowed: true };
  }

  // If user is owner and lockToken matches (or session matches), allow
  if (status.isOwner) {
    if (!providedLockToken || providedLockToken === status.lockToken) {
      return { allowed: true, lockToken: status.lockToken };
    }
  }

  // If locked by someone else or token mismatch, reject
  return {
    allowed: false,
    status: 423,
    code: 'CONCURRENCY_LOCK_CONFLICT',
    message: `Record ${resourceId} is currently locked by ${status.lockedBy?.fullName || status.lockedBy?.username} for ${status.reason || 'editing'}. Lock expires in ${status.remainingSeconds}s.`,
    conflict: status
  };
}

module.exports = {
  isLockCompatible,
  acquireLock,
  releaseLock,
  checkLockStatus,
  renewLock,
  verifyLockForWrite,
  DEFAULT_LEASE_SECONDS
};
