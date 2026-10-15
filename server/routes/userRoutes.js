const express = require('express');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const AuditLog = require('../models/AuditLog');
const SessionToken = require('../models/SessionToken');
const authenticateToken = require('../middleware/authMiddleware');
const authorizeRoles = require('../middleware/roleMiddleware');
const { authorizePermission } = require('../middleware/permissionMiddleware');
const {
  ACCOUNT_MODELS,
  findAccountByIdAcrossRoles,
  findAccountByIdentifier,
  getAccountModel
} = require('../utils/accountCollections');

const router = express.Router();
const MAX_LIMIT = 100;
const validRoles = ['student', 'faculty', 'admin'];
const validAccountStatuses = ['active', 'inactive', 'suspended'];
const roleEmailDomains = {
  student: 'student.buksu.edu.ph',
  faculty: 'faculty.buksu.edu.ph'
};

const isValidAccountEmail = (email, role) => {
  if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    return false;
  }
  const requiredDomain = roleEmailDomains[role];
  return !requiredDomain || email.trim().toLowerCase().endsWith(`@${requiredDomain}`);
};

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const toSafeUser = (user) => ({
  id: user._id,
  username: user.username,
  firstName: user.firstName || user.personalInformation?.firstName || '',
  lastName: user.lastName || user.personalInformation?.lastName || '',
  email: user.email || '',
  studentNumber: user.studentNumber || user.institutionId || '',
  employeeId: user.employeeId || '',
  department: user.department || '',
  role: user.role,
  accountStatus: user.accountStatus,
  createdAt: user.createdAt
});

const getAuditActorModel = (role) => ({
  admin: 'AdminUser',
  faculty: 'FacultyUser',
  student: 'Student'
}[role]);

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
        if (!isValidAccountEmail(email, role)) {
          return res.status(400).json({
            success: false,
            message: roleEmailDomains[role]
              ? `A valid @${roleEmailDomains[role]} email is required`
              : 'A valid email is required'
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

      const entries = role
        ? [[role, getAccountModel(role)]]
        : Object.entries(ACCOUNT_MODELS);
      const [counts, accountsByRole] = await Promise.all([
        Promise.all(entries.map(([, AccountModel]) => AccountModel.countDocuments(filter))),
        Promise.all(entries.map(async ([accountRole, AccountModel]) => ({
          role: accountRole,
          accounts: await AccountModel.find(filter)
            .select('username firstName lastName email studentNumber institutionId personalInformation employeeId department role accountStatus createdAt')
            .lean()
        })))
      ]);
      const total = counts.reduce((sum, count) => sum + count, 0);
      const users = accountsByRole
        .flatMap(({ role: accountRole, accounts }) => accounts.map((account) => ({
          ...account,
          role: accountRole
        })))
        .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
          || String(b._id).localeCompare(String(a._id)))
        .slice((page - 1) * limit, page * limit);

      res.json({
        success: true,
        data: {
          users: users.map(toSafeUser),
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
      const passwordHash = await bcrypt.hash(password, 10);
      const accountUsername = role === 'student' ? studentNumber.trim() : username.trim();
      const existingUsername = await findAccountByIdentifier(
        accountUsername,
        ['username', 'institutionId', 'studentNumber']
      );
      const existingEmail = email.trim()
        ? await findAccountByIdentifier(email.trim(), ['email'])
        : { account: null, ambiguous: false };
      if (existingUsername.account || existingUsername.ambiguous || existingEmail.account || existingEmail.ambiguous) {
        return res.status(409).json({ success: false, message: 'Username, student number, or email already exists' });
      }
      const AccountModel = getAccountModel(role);
      const user = await AccountModel.create(role === 'student' ? {
        username: accountUsername,
        institutionId: accountUsername,
        passwordHash,
        role,
        accountStatus: 'active',
        email: String(email).trim().toLowerCase(),
        personalInformation: {
          firstName: String(firstName).trim(),
          lastName: String(lastName).trim()
        },
        classification: { studentType: 'regular' }
      } : {
        username: accountUsername,
        passwordHash,
        role,
        firstName: String(firstName).trim(),
        lastName: String(lastName).trim(),
        email: String(email).trim().toLowerCase(),
        employeeId: String(employeeId).trim(),
        department: String(department).trim()
      });

      await AuditLog.create({
        userId: req.user.userId,
        userRole: req.user.role,
        userModel: getAuditActorModel(req.user.role),
        action: 'USER_CREATED',
        targetType: 'user',
        targetId: user._id,
        details: {
          username: user.username,
          role: user.role,
          userId: user._id
        }
      });

      return res.status(201).json({
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

      if (username !== undefined) {
        if (typeof username !== 'string' || !username.trim()) {
          return res.status(400).json({ success: false, message: 'A valid username is required' });
        }
      }
      if (password !== undefined) {
        if (typeof password !== 'string' || password.length < 8) {
          return res.status(400).json({ success: false, message: 'Password must be at least 8 characters' });
        }
      }
      if (role !== undefined && !validRoles.includes(role)) {
        return res.status(400).json({ success: false, message: 'role must be one of student, faculty, or admin' });
      }
      for (const [field, value] of Object.entries({ firstName, lastName, email, studentNumber, employeeId, department })) {
        if (value !== undefined && typeof value !== 'string') {
          return res.status(400).json({ success: false, message: `${field} must be a string` });
        }
      }
      if (accountStatus !== undefined && !validAccountStatuses.includes(accountStatus)) {
        return res.status(400).json({ success: false, message: 'accountStatus must be one of active, inactive, or suspended' });
      }
      const targetRole = req.query.role;
      if (targetRole !== undefined && !validRoles.includes(targetRole)) {
        return res.status(400).json({ success: false, message: 'role must be one of student, faculty, or admin' });
      }
      const lookup = targetRole
        ? { account: await getAccountModel(targetRole).findById(userId), role: targetRole, ambiguous: false }
        : await findAccountByIdAcrossRoles(userId);
      if (lookup.ambiguous) {
        return res.status(409).json({ success: false, message: 'This ID exists in multiple role collections. Specify the account role.' });
      }
      const existingUser = lookup.account;
      if (!existingUser) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }
      if (existingUser.role !== lookup.role) {
        return res.status(409).json({ success: false, message: 'Account role does not match its role-specific collection' });
      }
      if (
        lookup.role === req.user.role &&
        String(req.user.userId) === String(userId) &&
        accountStatus !== undefined &&
        accountStatus !== 'active'
      ) {
        return res.status(400).json({ success: false, message: 'Administrators cannot disable their own account' });
      }

      if (role !== undefined && role !== lookup.role) {
        return res.status(400).json({
          success: false,
          message: 'Account roles cannot be changed. Create a new account in the correct role collection.'
        });
      }

      if (
        lookup.role === 'student' &&
        username !== undefined &&
        username.trim() !== existingUser.institutionId
      ) {
        return res.status(400).json({
          success: false,
          message: 'A student username is the institution ID and cannot be changed through account management'
        });
      }
      if (
        lookup.role === 'student' &&
        studentNumber !== undefined &&
        studentNumber.trim() !== existingUser.institutionId
      ) {
        return res.status(400).json({
          success: false,
          message: 'A student institution ID cannot be changed through account management'
        });
      }

      if (username !== undefined && lookup.role !== 'student') {
        const duplicateUsername = await findAccountByIdentifier(username.trim(), ['username']);
        if (duplicateUsername.ambiguous || (
          duplicateUsername.account &&
          String(duplicateUsername.account._id) !== String(existingUser._id)
        )) {
          return res.status(409).json({ success: false, message: 'Username already exists' });
        }
      }
      if (email !== undefined) {
        if (!isValidAccountEmail(email, lookup.role)) {
          return res.status(400).json({
            success: false,
            message: roleEmailDomains[lookup.role]
              ? `A valid @${roleEmailDomains[lookup.role]} email is required`
              : 'A valid email is required'
          });
        }
        const duplicateEmail = await findAccountByIdentifier(email.trim(), ['email']);
        if (duplicateEmail.ambiguous || (
          duplicateEmail.account &&
          String(duplicateEmail.account._id) !== String(existingUser._id)
        )) {
          return res.status(409).json({ success: false, message: 'Email already exists' });
        }
      }

      const user = existingUser;
      const normalizedValues = { firstName, lastName, email, studentNumber, employeeId, department };
      if (lookup.role === 'student') {
        if (firstName !== undefined) user.personalInformation.firstName = firstName.trim();
        if (lastName !== undefined) user.personalInformation.lastName = lastName.trim();
      } else {
        for (const field of ['firstName', 'lastName', 'employeeId', 'department']) {
          if (normalizedValues[field] !== undefined) user[field] = normalizedValues[field].trim();
        }
      }
      if (email !== undefined) user.email = email.trim().toLowerCase();
      if (username !== undefined && lookup.role !== 'student') user.username = username.trim();
      if (password !== undefined) user.passwordHash = await bcrypt.hash(password, 10);
      if (accountStatus !== undefined) user.accountStatus = accountStatus;
      await user.save();

      if (
        password !== undefined ||
        accountStatus !== undefined && accountStatus !== 'active'
      ) {
        await SessionToken.updateMany(
          { userId: user._id, accountRole: lookup.role, revokedAt: null },
          { revokedAt: new Date() }
        );
      }

      await AuditLog.create({
        userId: req.user.userId,
        userRole: req.user.role,
        userModel: getAuditActorModel(req.user.role),
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

      const targetRole = req.query.role;
      if (targetRole !== undefined && !validRoles.includes(targetRole)) {
        return res.status(400).json({ success: false, message: 'role must be one of student, faculty, or admin' });
      }
      const lookup = targetRole
        ? { account: await getAccountModel(targetRole).findById(userId), role: targetRole, ambiguous: false }
        : await findAccountByIdAcrossRoles(userId);
      if (lookup.ambiguous) {
        return res.status(409).json({ success: false, message: 'This ID exists in multiple role collections. Specify the account role.' });
      }
      const user = lookup.account;
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }
      if (user.role !== lookup.role) {
        return res.status(409).json({ success: false, message: 'Account role does not match its role-specific collection' });
      }
      if (
        lookup.role === req.user.role &&
        String(req.user.userId) === String(userId) &&
        accountStatus !== 'active'
      ) {
        return res.status(400).json({
          success: false,
          message: 'Administrators cannot disable their own account'
        });
      }

      user.accountStatus = accountStatus;
      await user.save();

      if (accountStatus !== 'active') {
        await SessionToken.updateMany(
          { userId: user._id, accountRole: lookup.role, revokedAt: null },
          { revokedAt: new Date() }
        );
      }

      await AuditLog.create({
        userId: req.user.userId,
        userRole: req.user.role,
        userModel: getAuditActorModel(req.user.role),
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
