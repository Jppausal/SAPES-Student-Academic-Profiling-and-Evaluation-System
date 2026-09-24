const express = require('express');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const User = require('../models/User');
const Student = require('../models/Student');
const AuditLog = require('../models/AuditLog');
const authenticateToken = require('../middleware/authMiddleware');
const authorizeRoles = require('../middleware/roleMiddleware');
const { authorizePermission } = require('../middleware/permissionMiddleware');

const router = express.Router();
const MAX_LIMIT = 100;
const validRoles = ['student', 'faculty', 'admin'];
const validAccountStatuses = ['active', 'inactive', 'suspended'];

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const toSafeUser = (user) => ({
  id: user._id,
  username: user.username,
  firstName: user.firstName || '',
  lastName: user.lastName || '',
  email: user.email || '',
  studentNumber: user.studentNumber || '',
  employeeId: user.employeeId || '',
  department: user.department || '',
  role: user.role,
  accountStatus: user.accountStatus,
  createdAt: user.createdAt
});

const syncStudentIdentity = async (user) => {
  if (user.role !== 'student') return;

  const student = await Student.findOne({ userId: user._id });
  if (!student) return;

  student.personalInformation.firstName = user.firstName || student.personalInformation.firstName;
  student.personalInformation.lastName = user.lastName || student.personalInformation.lastName;
  await student.save();
};

router.get(
  '/',
  authenticateToken,
  authorizeRoles('admin'),
  authorizePermission('manage_users'),
  async (req, res) => {
    try {
      const {
        role,
        accountStatus,
        search,
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

      if (role !== undefined) {
        if (!validRoles.includes(role)) {
          return res.status(400).json({
            success: false,
            message: 'role must be one of student, faculty, or admin'
          });
        }
        filter.role = role;
      }

      if (accountStatus !== undefined) {
        if (!validAccountStatuses.includes(accountStatus)) {
          return res.status(400).json({
            success: false,
            message: 'accountStatus must be one of active, inactive, or suspended'
          });
        }
        filter.accountStatus = accountStatus;
      }

      if (search !== undefined) {
        if (typeof search !== 'string' || !search.trim()) {
          return res.status(400).json({
            success: false,
            message: 'search must be a non-empty string'
          });
        }
        filter.username = {
          $regex: escapeRegex(search.trim()),
          $options: 'i'
        };
      }

      const [total, users] = await Promise.all([
        User.countDocuments(filter),
        User.find(
          filter,
          {
            username: 1,
            firstName: 1,
            lastName: 1,
            email: 1,
            studentNumber: 1,
            employeeId: 1,
            department: 1,
            role: 1,
            accountStatus: 1,
            createdAt: 1
          }
        )
          .sort({ createdAt: -1, _id: -1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .lean()
      ]);

      const studentIds = users
        .filter((user) => user.role === 'student' && !user.studentNumber)
        .map((user) => user._id);
      const linkedStudents = studentIds.length
        ? await Student.find({ userId: { $in: studentIds } }, { userId: 1, institutionId: 1, personalInformation: 1 }).lean()
        : [];
      const studentNumberByUserId = new Map(
        linkedStudents.map((student) => [String(student.userId), student.institutionId])
      );
      const studentIdentityByUserId = new Map(
        linkedStudents.map((student) => [String(student.userId), student.personalInformation || {}])
      );

      res.json({
        success: true,
        data: {
          users: users.map((user) => toSafeUser({
            ...user,
            firstName: user.firstName || studentIdentityByUserId.get(String(user._id))?.firstName || '',
            lastName: user.lastName || studentIdentityByUserId.get(String(user._id))?.lastName || '',
            studentNumber: user.studentNumber || studentNumberByUserId.get(String(user._id)) || ''
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
      console.error('Error fetching users:', error);

      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  }
);

router.post(
  '/',
  authenticateToken,
  authorizeRoles('admin'),
  authorizePermission('manage_users'),
  async (req, res) => {
    try {
      const body = req.body || {};
      const allowedFields = ['username', 'password', 'role', 'firstName', 'lastName', 'email', 'studentNumber', 'employeeId', 'department'];
      const unsupportedFields = Object.keys(body).filter(
        (field) => !allowedFields.includes(field)
      );

      if (unsupportedFields.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Unsupported user fields'
        });
      }

      const { username, password, role, firstName = '', lastName = '', email = '', studentNumber = '', employeeId = '', department = '' } = body;

      if (typeof username !== 'string' || !username.trim()) {
        return res.status(400).json({
          success: false,
          message: 'A valid username is required'
        });
      }

      if (typeof password !== 'string' || password.length < 8) {
        return res.status(400).json({
          success: false,
          message: 'Password must be at least 8 characters'
        });
      }

      if (!validRoles.includes(role)) {
        return res.status(400).json({
          success: false,
          message: 'role must be one of student, faculty, or admin'
        });
      }

      if (role === 'student' && (typeof studentNumber !== 'string' || !studentNumber.trim())) {
        return res.status(400).json({ success: false, message: 'Student number is required for student accounts' });
      }
      if (role === 'student' && (!String(firstName).trim() || !String(lastName).trim())) {
        return res.status(400).json({ success: false, message: 'First name and last name are required for student accounts' });
      }
      if (role === 'student' && await Student.exists({ institutionId: studentNumber.trim() })) {
        return res.status(409).json({ success: false, message: 'Student number already exists' });
      }

      const passwordHash = await bcrypt.hash(password, 10);
      const user = await User.create({
        username: role === 'student' ? studentNumber.trim() : username.trim(),
        passwordHash,
        role,
        firstName: String(firstName).trim(),
        lastName: String(lastName).trim(),
        email: String(email).trim(),
        studentNumber: String(studentNumber).trim(),
        employeeId: String(employeeId).trim(),
        department: String(department).trim()
      });

      if (role === 'student') {
        await Student.create({
          userId: user._id,
          institutionId: studentNumber.trim(),
          personalInformation: {
            firstName: String(firstName).trim(),
            lastName: String(lastName).trim()
          },
          classification: { studentType: 'regular' }
        });
      }

      await AuditLog.create({
        userId: req.user.userId,
        action: 'USER_CREATED',
        targetType: 'user',
        targetId: user._id,
        details: {
          username: user.username,
          role: user.role,
          userId: user._id
        }
      });

      res.status(201).json({
        success: true,
        message: 'User created successfully',
        data: {
          user: toSafeUser(user)
        }
      });
    } catch (error) {
      if (error?.code === 11000 && error.keyPattern?.username) {
        return res.status(409).json({
          success: false,
          message: 'Username already exists'
        });
      }

      console.error('Error creating user:', error);

      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  }
);

router.put(
  '/:userId',
  authenticateToken,
  authorizeRoles('admin'),
  authorizePermission('manage_users'),
  async (req, res) => {
    try {
      const { userId } = req.params;
      const body = req.body || {};
      const allowedFields = ['username', 'password', 'role', 'accountStatus', 'firstName', 'lastName', 'email', 'studentNumber', 'employeeId', 'department'];
      const unsupportedFields = Object.keys(body).filter(
        (field) => !allowedFields.includes(field)
      );

      if (unsupportedFields.length > 0 || !mongoose.isValidObjectId(userId)) {
        return res.status(400).json({
          success: false,
          message: unsupportedFields.length > 0 ? 'Unsupported user fields' : 'Invalid user ID'
        });
      }

      const { username, password, role, accountStatus, firstName, lastName, email, studentNumber, employeeId, department } = body;
      const updates = {};

      if (username !== undefined) {
        if (typeof username !== 'string' || !username.trim()) {
          return res.status(400).json({ success: false, message: 'A valid username is required' });
        }
        updates.username = username.trim();
      }
      if (password !== undefined) {
        if (typeof password !== 'string' || password.length < 8) {
          return res.status(400).json({ success: false, message: 'Password must be at least 8 characters' });
        }
        updates.passwordHash = await bcrypt.hash(password, 10);
      }
      if (role !== undefined && !validRoles.includes(role)) {
        return res.status(400).json({ success: false, message: 'role must be one of student, faculty, or admin' });
      }
      for (const [field, value] of Object.entries({ firstName, lastName, email, studentNumber, employeeId, department })) {
        if (value !== undefined && typeof value !== 'string') {
          return res.status(400).json({ success: false, message: `${field} must be a string` });
        }
        if (value !== undefined) updates[field] = value.trim();
      }
      if (accountStatus !== undefined && !validAccountStatuses.includes(accountStatus)) {
        return res.status(400).json({ success: false, message: 'accountStatus must be one of active, inactive, or suspended' });
      }
      if (String(req.user.userId) === String(userId) && accountStatus === 'inactive') {
        return res.status(400).json({ success: false, message: 'Administrators cannot deactivate their own account' });
      }

      const existingUser = await User.findById(userId);
      if (!existingUser) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }
      const effectiveRole = role || existingUser.role;
      const effectiveStudentNumber = studentNumber || existingUser.studentNumber;
      if (effectiveRole === 'student' && !effectiveStudentNumber) {
        return res.status(400).json({ success: false, message: 'Student number is required for student accounts' });
      }
      if (effectiveRole === 'student') {
        updates.username = effectiveStudentNumber.trim();
        updates.studentNumber = effectiveStudentNumber.trim();
      }

      const user = await User.findByIdAndUpdate(userId, updates, { new: true, runValidators: true });
      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      await syncStudentIdentity(user);

      await AuditLog.create({
        userId: req.user.userId,
        action: 'USER_UPDATED',
        targetType: 'user',
        targetId: user._id,
        details: { username: user.username, role: user.role, accountStatus: user.accountStatus, userId: user._id }
      });

      return res.json({
        success: true,
        message: 'User updated successfully',
        data: { user: toSafeUser(user) }
      });
    } catch (error) {
      if (error?.code === 11000 && error.keyPattern?.username) {
        return res.status(409).json({ success: false, message: 'Username already exists' });
      }
      console.error('Error updating user:', error);
      return res.status(500).json({ success: false, message: 'Server error' });
    }
  }
);

router.put(
  '/:userId/status',
  authenticateToken,
  authorizeRoles('admin'),
  authorizePermission('manage_users'),
  async (req, res) => {
    try {
      const { userId } = req.params;
      const body = req.body || {};
      const unsupportedFields = Object.keys(body).filter(
        (field) => field !== 'accountStatus'
      );

      if (unsupportedFields.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Only accountStatus may be updated'
        });
      }

      const { accountStatus } = body;

      if (!mongoose.isValidObjectId(userId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid user ID'
        });
      }

      if (!validAccountStatuses.includes(accountStatus)) {
        return res.status(400).json({
          success: false,
          message: 'accountStatus must be one of active, inactive, or suspended'
        });
      }

      if (
        String(req.user.userId) === String(userId) &&
        accountStatus === 'inactive'
      ) {
        return res.status(400).json({
          success: false,
          message: 'Administrators cannot deactivate their own account'
        });
      }

      const user = await User.findById(userId);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      user.accountStatus = accountStatus;
      await user.save();

      await AuditLog.create({
        userId: req.user.userId,
        action: 'USER_STATUS_UPDATED',
        targetType: 'user',
        targetId: user._id,
        details: {
          username: user.username,
          role: user.role,
          accountStatus: user.accountStatus,
          userId: user._id
        }
      });

      res.json({
        success: true,
        message: 'User status updated successfully',
        data: {
          user: toSafeUser(user)
        }
      });
    } catch (error) {
      console.error('Error updating user status:', error);

      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  }
);

module.exports = router;
