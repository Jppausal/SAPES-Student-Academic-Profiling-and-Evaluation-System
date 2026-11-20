const express = require('express');
const authenticateToken = require('../middleware/authMiddleware');
const authorizeRoles = require('../middleware/roleMiddleware');
const {
  acquireLock,
  releaseLock,
  checkLockStatus,
  renewLock
} = require('../utils/lockManager');

const router = express.Router();

/**
 * POST /api/locks/acquire
 * Acquires a shared (S) or exclusive (X) lock on a resource (Strict 2PL Growing Phase).
 */
router.post(
  '/acquire',
  authenticateToken,
  authorizeRoles('faculty', 'admin'),
  async (req, res) => {
    try {
      const {
        resourceType = 'STUDENT',
        resourceId,
        lockMode = 'EXCLUSIVE',
        durationSeconds,
        reason,
        transactionId
      } = req.body || {};

      if (!resourceId) {
        return res.status(400).json({ success: false, message: 'resourceId is required' });
      }

      const result = await acquireLock({
        resourceType,
        resourceId,
        lockMode,
        user: req.user,
        durationSeconds,
        reason,
        transactionId,
        req
      });

      if (!result.success && result.status === 'CONFLICT') {
        return res.status(423).json(result);
      }

      return res.json(result);
    } catch (error) {
      console.error('Lock acquisition error:', error);
      return res.status(500).json({ success: false, message: error.message || 'Internal server error acquiring lock' });
    }
  }
);

/**
 * POST /api/locks/release
 * Releases a record lock (Strict 2PL Shrinking Phase).
 */
router.post(
  '/release',
  authenticateToken,
  authorizeRoles('faculty', 'admin'),
  async (req, res) => {
    try {
      const { resourceType = 'STUDENT', resourceId, lockToken, force = false } = req.body || {};
      if (!resourceId) {
        return res.status(400).json({ success: false, message: 'resourceId is required' });
      }

      // Only admins can force-release locks held by others
      const allowForce = force && req.user.role === 'admin';

      const result = await releaseLock({
        resourceType,
        resourceId,
        lockToken,
        user: req.user,
        force: allowForce,
        req
      });

      if (!result.success) {
        return res.status(403).json(result);
      }

      return res.json(result);
    } catch (error) {
      console.error('Lock release error:', error);
      return res.status(500).json({ success: false, message: error.message || 'Internal server error releasing lock' });
    }
  }
);

/**
 * GET /api/locks/status/:resourceType/:resourceId
 * Returns current lock status of a resource.
 */
router.get(
  '/status/:resourceType/:resourceId',
  authenticateToken,
  async (req, res) => {
    try {
      const { resourceType, resourceId } = req.params;
      const status = await checkLockStatus(resourceType, resourceId, req.user);
      return res.json({ success: true, data: status });
    } catch (error) {
      console.error('Lock status check error:', error);
      return res.status(500).json({ success: false, message: 'Internal server error checking lock status' });
    }
  }
);

/**
 * POST /api/locks/renew
 * Heartbeat extension for an active lock lease.
 */
router.post(
  '/renew',
  authenticateToken,
  authorizeRoles('faculty', 'admin'),
  async (req, res) => {
    try {
      const { resourceType = 'STUDENT', resourceId, lockToken, durationSeconds } = req.body || {};
      if (!resourceId || !lockToken) {
        return res.status(400).json({ success: false, message: 'resourceId and lockToken are required' });
      }

      const result = await renewLock({
        resourceType,
        resourceId,
        lockToken,
        durationSeconds
      });

      if (!result.success) {
        return res.status(404).json(result);
      }

      return res.json(result);
    } catch (error) {
      console.error('Lock renewal error:', error);
      return res.status(500).json({ success: false, message: 'Internal server error renewing lock' });
    }
  }
);

module.exports = router;
