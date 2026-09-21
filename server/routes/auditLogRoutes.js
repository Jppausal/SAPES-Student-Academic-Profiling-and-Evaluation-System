const express = require('express');
const mongoose = require('mongoose');
const AuditLog = require('../models/AuditLog');
const authenticateToken = require('../middleware/authMiddleware');
const authorizeRoles = require('../middleware/roleMiddleware');

const router = express.Router();
const MAX_LIMIT = 100;
const sensitiveDetailKeys = new Set([
  'password',
  'passwordHash',
  'token',
  'jwt',
  'jwtSecret',
  'secret',
  'credentials',
  'mongoUri',
  'connectionString'
]);

const sanitizeDetails = (value) => {
  if (Array.isArray(value)) {
    return value.map(sanitizeDetails);
  }

  if (value && typeof value === 'object') {
    return Object.entries(value).reduce((safeDetails, [key, detail]) => {
      if (!sensitiveDetailKeys.has(key)) {
        safeDetails[key] = sanitizeDetails(detail);
      }
      return safeDetails;
    }, {});
  }

  return value;
};

router.get(
  '/',
  authenticateToken,
  authorizeRoles('admin'),
  async (req, res) => {
    try {
      const {
        action,
        targetType,
        userId,
        page: pageParam = '1',
        limit: limitParam = '20'
      } = req.query;

      const page = Number(pageParam);
      const limit = Number(limitParam);

      if (
        !Number.isInteger(page) ||
        page < 1 ||
        !Number.isInteger(limit) ||
        limit < 1 ||
        limit > MAX_LIMIT
      ) {
        return res.status(400).json({
          success: false,
          message: `page must be a positive integer and limit must be an integer from 1 to ${MAX_LIMIT}`
        });
      }

      const filter = {};

      if (action !== undefined) {
        if (typeof action !== 'string' || !action.trim()) {
          return res.status(400).json({
            success: false,
            message: 'action must be a non-empty string'
          });
        }
        filter.action = action.trim();
      }

      if (targetType !== undefined) {
        if (typeof targetType !== 'string' || !targetType.trim()) {
          return res.status(400).json({
            success: false,
            message: 'targetType must be a non-empty string'
          });
        }
        filter.targetType = targetType.trim();
      }

      if (userId !== undefined) {
        if (typeof userId !== 'string' || !mongoose.isValidObjectId(userId)) {
          return res.status(400).json({
            success: false,
            message: 'userId must be a valid user ID'
          });
        }
        filter.userId = userId;
      }

      const [total, auditLogs] = await Promise.all([
        AuditLog.countDocuments(filter),
        AuditLog.find(
          filter,
          {
            _id: 0,
            userId: 1,
            action: 1,
            targetType: 1,
            targetId: 1,
            timestamp: 1,
            details: 1
          }
        )
          .populate({
            path: 'userId',
            select: '-_id username role'
          })
          .sort({ timestamp: -1, _id: -1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .lean()
      ]);

      res.json({
        success: true,
        data: {
          auditLogs: auditLogs.map((auditLog) => ({
            ...auditLog,
            details: sanitizeDetails(auditLog.details)
          })),
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit)
          }
        }
      });
    } catch (error) {
      console.error('Error fetching audit logs:', error);

      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  }
);

module.exports = router;
