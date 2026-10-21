const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('node:crypto');
const { OAuth2Client } = require('google-auth-library');
const Student = require('../models/Student');
const SessionToken = require('../models/SessionToken');
const authenticateToken = require('../middleware/authMiddleware');
const { sendPasswordResetCode } = require('../utils/email');
const {
  findAccountByGoogleId,
  findAccountByIdentifier,
  getAccountModel
} = require('../utils/accountCollections');

const router = express.Router();
const GOOGLE_ALLOWED_DOMAINS = new Set([
  'buksu.edu.ph',
  'student.buksu.edu.ph',
  'faculty.buksu.edu.ph'
]);
const GOOGLE_ISSUERS = new Set(['accounts.google.com', 'https://accounts.google.com']);
const ROLE_EMAIL_DOMAINS = {
  student: 'student.buksu.edu.ph',
  faculty: 'faculty.buksu.edu.ph'
};
const TECHNOLOGY_PROGRAMS = [
  { name: 'Bachelor of Information Technology', code: 'BSIT' },
  { name: 'Entertainment and Multimedia Computing', code: 'BSEMC' },
  { name: 'Electronics', code: 'BSELEX' },
  { name: 'Food Technology', code: 'BSFT' },
  { name: 'Automotive Technology', code: 'BSAT' }
];
const RESET_WINDOW_MS = 10 * 60 * 1000;
const RESET_REQUEST_INTERVAL_MS = 60 * 1000;
const resetCodeHash = (code) => crypto.createHash('sha256').update(code).digest('hex');

const emailMatchesRoleDomain = (email, role) => {
  const domain = ROLE_EMAIL_DOMAINS[role];
  return !domain || (
    typeof email === 'string'
    && email.trim().toLowerCase().endsWith(`@${domain}`)
  );
};

const getGoogleName = (payload) => {
  const parts = typeof payload.name === 'string'
    ? payload.name.trim().split(/\s+/).filter(Boolean)
    : [];
  const givenName = typeof payload.given_name === 'string' ? payload.given_name.trim() : '';
  const firstName = givenName || parts.shift() || '';
  if (givenName) {
    const index = parts.findIndex((part) => part.toLowerCase() === givenName.toLowerCase());
    if (index >= 0) parts.splice(0, index + 1);
  }
  const lastName = typeof payload.family_name === 'string'
    ? payload.family_name.trim()
    : parts.join(' ');
  return { firstName, lastName };
};

const getDefaultStudentEnrollment = () => {
  const program = TECHNOLOGY_PROGRAMS[crypto.randomInt(TECHNOLOGY_PROGRAMS.length)];
  const yearLevel = crypto.randomInt(1, 5);
  const section = String.fromCharCode(65 + crypto.randomInt(3));
  return {
    program,
    yearLevel,
    section: `${program.code}-${yearLevel}${section}`
  };
};

const createApplicationToken = async (user) => {
  const jti = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
  const token = jwt.sign(
    { jti, userId: user._id, role: user.role, username: user.username },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );
  await SessionToken.create({
    jti,
    userId: user._id,
    accountRole: user.role,
    expiresAt
  });
  return token;
};

const safeUser = (user) => ({
  id: user._id,
  username: user.username,
  role: user.role,
  firstName: user.firstName || user.personalInformation?.firstName || '',
  lastName: user.lastName || user.personalInformation?.lastName || '',
  email: user.email || '',
  employeeId: user.employeeId || '',
  department: user.department || '',
  ...(user.role === 'faculty'
    ? {
        designation: user.designation || 'Verified enrollment officer',
        departmentCode: user.departmentCode || '',
        isVerifiedEnrollmentOfficer: Boolean(user.isVerifiedEnrollmentOfficer)
      }
    : {}),
  ...((user.studentNumber || user.institutionId)
    ? { studentNumber: user.studentNumber || user.institutionId }
    : {})
});

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (typeof username !== 'string' || !username.trim() || typeof password !== 'string' || !password) {
      return res.status(400).json({ success: false, message: 'Username and password are required' });
    }

    const loginIdentifier = username.trim();
    const { account, role, ambiguous } = await findAccountByIdentifier(
      loginIdentifier,
      ['email', 'username', 'institutionId', 'studentNumber'],
      '+passwordHash'
    );
    if (ambiguous) {
      return res.status(409).json({
        success: false,
        message: 'This login identifier matches multiple accounts. Contact an administrator.'
      });
    }
    if (!account) return res.status(401).json({ success: false, message: 'Invalid username or password' });
    if (account.role && account.role !== role) {
      return res.status(403).json({
        success: false,
        message: 'Account role does not match its role-specific collection'
      });
    }
    account.role = role;
    if (
      !emailMatchesRoleDomain(account.email, role)
      || (loginIdentifier.includes('@') && !emailMatchesRoleDomain(loginIdentifier, role))
    ) {
      const requiredDomain = ROLE_EMAIL_DOMAINS[role];
      const message = requiredDomain
        ? `${role} accounts must use an @${requiredDomain} email address`
        : 'Account email does not match its assigned role';
      return res.status(403).json({ success: false, message });
    }
    if (account.accountStatus !== 'active') {
      return res.status(403).json({ success: false, message: 'Account is not active' });
    }

    const passwordMatch = await bcrypt.compare(password, account.passwordHash).catch(() => false);
    const legacyPasswordMatch = !passwordMatch && account.passwordHash === password;
    if (!passwordMatch && !legacyPasswordMatch) {
      return res.status(401).json({ success: false, message: 'Invalid username or password' });
    }
    if (legacyPasswordMatch) account.passwordHash = await bcrypt.hash(password, 12);

    account.lastLoginAt = new Date();
    await account.save();
    return res.json({
      success: true,
      message: 'Login successful',
      token: await createApplicationToken(account),
      user: safeUser(account)
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.post('/logout', authenticateToken, async (req, res) => {
  try {
    await SessionToken.findOneAndUpdate(
      { jti: req.user.jti, revokedAt: null },
      { revokedAt: new Date() }
    );
    return res.json({ success: true, message: 'Logout successful' });
  } catch (error) {
    console.error('Logout error:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.get('/settings', authenticateToken, async (req, res) => {
  try {
    const AccountModel = getAccountModel(req.user.role);
    if (!AccountModel) return res.status(403).json({ success: false, message: 'Unsupported account role' });
    const user = await AccountModel.findById(req.user.userId).select('notificationPreferences').lean();
    return res.json({
      success: true,
      data: {
        notificationPreferences: user?.notificationPreferences || { profileAndAcademicUpdates: true }
      }
    });
  } catch (error) {
    console.error('User settings read failed:', error);
    return res.status(500).json({ success: false, message: 'Unable to load user settings' });
  }
});

router.put('/settings', authenticateToken, async (req, res) => {
  try {
    const value = req.body?.notificationPreferences?.profileAndAcademicUpdates;
    if (typeof value !== 'boolean') {
      return res.status(400).json({ success: false, message: 'Notification preference must be a boolean' });
    }
    const AccountModel = getAccountModel(req.user.role);
    if (!AccountModel) return res.status(403).json({ success: false, message: 'Unsupported account role' });
    await AccountModel.findByIdAndUpdate(
      req.user.userId,
      { 'notificationPreferences.profileAndAcademicUpdates': value },
      { runValidators: true }
    );
    return res.json({
      success: true,
      data: { notificationPreferences: { profileAndAcademicUpdates: value } }
    });
  } catch (error) {
    console.error('User settings update failed:', error);
    return res.status(500).json({ success: false, message: 'Unable to save user settings' });
  }
});

router.post('/password-reset/request', async (req, res) => {
  const genericResponse = { success: true, message: 'If the account is eligible, a verification code has been sent to its registered institutional email.' };
  try {
    const username = typeof req.body?.username === 'string' ? req.body.username.trim() : '';
    if (!username) return res.status(400).json({ success: false, message: 'Username or institution ID is required' });
    const { account } = await findAccountByIdentifier(
      username,
      ['email', 'username', 'institutionId', 'studentNumber'],
      '+passwordResetRequestedAt'
    );
    if (!account || account.accountStatus !== 'active' || !account.email) return res.json(genericResponse);
    if (account.passwordResetRequestedAt && Date.now() - account.passwordResetRequestedAt.getTime() < RESET_REQUEST_INTERVAL_MS) return res.json(genericResponse);
    const code = crypto.randomInt(100000, 1000000).toString();
    account.passwordResetCodeHash = resetCodeHash(code);
    account.passwordResetExpiresAt = new Date(Date.now() + RESET_WINDOW_MS);
    account.passwordResetAttempts = 0;
    account.passwordResetRequestedAt = new Date();
    await account.save();
    await sendPasswordResetCode(account.email, code);
    return res.json(genericResponse);
  } catch (error) {
    console.error('Password reset request error:', error);
    return res.status(503).json({ success: false, message: 'Password reset email is currently unavailable' });
  }
});

router.post('/password-reset/verify', async (req, res) => {
  try {
    const { username, code } = req.body || {};
    if (typeof username !== 'string' || typeof code !== 'string' || !/^\d{6}$/.test(code)) {
      return res.status(400).json({ success: false, message: 'Username and verification code are required' });
    }
    const { account, role, ambiguous } = await findAccountByIdentifier(
      username.trim(),
      ['email', 'username', 'institutionId', 'studentNumber'],
      '+passwordResetCodeHash +passwordResetExpiresAt +passwordResetAttempts'
    );
    if (ambiguous) return res.status(400).json({ success: false, message: 'The verification code is invalid or expired' });

    const submittedHash = resetCodeHash(code);
    const hashMatches = typeof account?.passwordResetCodeHash === 'string'
      && crypto.timingSafeEqual(Buffer.from(account.passwordResetCodeHash), Buffer.from(submittedHash));
    if (
      !account
      || account.accountStatus !== 'active'
      || !hashMatches
      || !account.passwordResetExpiresAt
      || account.passwordResetExpiresAt <= new Date()
      || account.passwordResetAttempts >= 5
    ) {
      if (account) {
        account.passwordResetAttempts = (account.passwordResetAttempts || 0) + 1;
        await account.save();
      }
      return res.status(400).json({ success: false, message: 'The verification code is invalid or expired' });
    }

    const nonce = crypto.randomBytes(32).toString('hex');
    const AccountModel = getAccountModel(role);
    const verified = await AccountModel.findOneAndUpdate(
      {
        _id: account._id,
        accountStatus: 'active',
        passwordResetCodeHash: submittedHash,
        passwordResetExpiresAt: { $gt: new Date() },
        passwordResetAttempts: { $lt: 5 }
      },
      {
        $set: {
          passwordResetCodeHash: resetCodeHash(nonce),
          passwordResetExpiresAt: new Date(Date.now() + RESET_WINDOW_MS),
          passwordResetAttempts: 0
        }
      },
      { runValidators: true }
    );
    if (!verified) {
      return res.status(400).json({ success: false, message: 'The verification code is invalid or expired' });
    }
    const resetAuthorization = jwt.sign(
      { purpose: 'password_reset', userId: account._id, role, nonce },
      process.env.JWT_SECRET,
      { expiresIn: '10m' }
    );
    return res.json({ success: true, resetAuthorization });
  } catch (error) {
    console.error('Password reset verification error:', error);
    return res.status(500).json({ success: false, message: 'Unable to verify password reset code' });
  }
});

router.post('/password-reset/confirm', async (req, res) => {
  try {
    const { resetAuthorization, newPassword } = req.body || {};
    if (
      typeof resetAuthorization !== 'string'
      || typeof newPassword !== 'string'
      || newPassword.length < 8
    ) {
      return res.status(400).json({
        success: false,
        message: 'Verified reset authorization and a password of at least 8 characters are required'
      });
    }

    let authorization;
    try {
      authorization = jwt.verify(resetAuthorization, process.env.JWT_SECRET);
    } catch {
      return res.status(400).json({
        success: false,
        message: 'Password-reset verification has expired. Request a new code.'
      });
    }
    if (
      authorization.purpose !== 'password_reset'
      || !authorization.userId
      || !authorization.role
      || !authorization.nonce
    ) {
      return res.status(400).json({ success: false, message: 'Invalid password-reset verification' });
    }

    const AccountModel = getAccountModel(authorization.role);
    if (!AccountModel) return res.status(400).json({ success: false, message: 'Invalid password-reset verification' });
    const updated = await AccountModel.findOneAndUpdate(
      {
        _id: authorization.userId,
        role: authorization.role,
        accountStatus: 'active',
        passwordResetCodeHash: resetCodeHash(authorization.nonce),
        passwordResetExpiresAt: { $gt: new Date() }
      },
      {
        $set: { passwordHash: await bcrypt.hash(newPassword, 12) },
        $unset: { passwordResetCodeHash: 1, passwordResetExpiresAt: 1 }
      },
      { runValidators: true }
    );
    if (!updated) {
      return res.status(400).json({ success: false, message: 'Password-reset verification is no longer valid' });
    }

    await SessionToken.updateMany(
      { userId: authorization.userId, accountRole: authorization.role, revokedAt: null },
      { revokedAt: new Date() }
    );
    return res.json({ success: true, message: 'Password updated. Please log in with your new password.' });
  } catch (error) {
    console.error('Password reset confirmation error:', error);
    return res.status(500).json({ success: false, message: 'Unable to update password' });
  }
});

router.get('/settings', authenticateToken, async (req, res) => {
  try {
    const AccountModel = getAccountModel(req.user.role);
    const user = await AccountModel?.findById(req.user.userId)
      .select('notificationPreferences')
      .lean();
    if (!user) return res.status(404).json({ success: false, message: 'Account no longer exists' });
    return res.json({
      success: true,
      data: { notificationPreferences: user.notificationPreferences || { profileAndAcademicUpdates: true } }
    });
  } catch (error) {
    console.error('Settings lookup error:', error);
    return res.status(500).json({ success: false, message: 'Unable to load settings' });
  }
});

router.put('/settings', authenticateToken, async (req, res) => {
  try {
    const value = req.body?.notificationPreferences?.profileAndAcademicUpdates;
    if (typeof value !== 'boolean') {
      return res.status(400).json({ success: false, message: 'notification preference must be a boolean' });
    }
    const AccountModel = getAccountModel(req.user.role);
    const user = await AccountModel?.findByIdAndUpdate(
      req.user.userId,
      { 'notificationPreferences.profileAndAcademicUpdates': value },
      { new: true }
    );
    if (!user) return res.status(404).json({ success: false, message: 'Account no longer exists' });
    return res.json({ success: true, data: { notificationPreferences: { profileAndAcademicUpdates: value } } });
  } catch (error) {
    console.error('Settings update error:', error);
    return res.status(500).json({ success: false, message: 'Unable to save settings' });
  }
});

router.get('/session', authenticateToken, async (req, res) => {
  try {
    const AccountModel = getAccountModel(req.user.role);
    const user = await AccountModel?.findById(req.user.userId)
      .select('username role firstName lastName email studentNumber institutionId personalInformation employeeId department departmentCode designation isVerifiedEnrollmentOfficer accountStatus')
      .lean();
    if (!user || user.accountStatus !== 'active') {
      return res.status(401).json({ success: false, message: 'Account no longer exists or is inactive' });
    }
    return res.json({ success: true, user: safeUser(user) });
  } catch (error) {
    console.error('Session lookup error:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.post('/google', async (req, res) => {
  try {
    const { credential } = req.body || {};
    if (typeof credential !== 'string' || !credential) {
      return res.status(400).json({ success: false, message: 'Google credential is required' });
    }
    const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
    if (!clientId) {
      return res.status(503).json({ success: false, message: 'Google authentication is not configured' });
    }

    let payload;
    try {
      const ticket = await new OAuth2Client(clientId).verifyIdToken({ idToken: credential, audience: clientId });
      payload = ticket.getPayload();
    } catch (error) {
      console.warn('Google token verification failed:', error.message);
      return res.status(401).json({ success: false, message: 'Google account verification failed' });
    }

    if (
      !payload
      || !payload.sub
      || !payload.email
      || payload.email_verified !== true
      || !GOOGLE_ISSUERS.has(payload.iss)
      || payload.aud !== clientId
      || typeof payload.exp !== 'number'
      || payload.exp <= Math.floor(Date.now() / 1000)
      || !GOOGLE_ALLOWED_DOMAINS.has(payload.hd)
    ) {
      return res.status(401).json({ success: false, message: 'Google account verification failed' });
    }

    const email = payload.email.trim().toLowerCase();
    const studentMatch = email.match(/^(\d{10})@student\.buksu\.edu\.ph$/);
    if (email.endsWith('@student.buksu.edu.ph') && !studentMatch) {
      return res.status(403).json({
        success: false,
        message: 'Student Google account must use a 10-digit ID before @student.buksu.edu.ph'
      });
    }

    let { account, role, ambiguous } = await findAccountByGoogleId(payload.sub);
    if (ambiguous) {
      return res.status(409).json({
        success: false,
        message: 'This Google account is linked to multiple SAPES accounts. Contact an administrator.'
      });
    }

    const identityLookup = account
      ? { account, role, ambiguous: false }
      : await findAccountByIdentifier(
        email,
        ['email', 'username', 'institutionId', 'studentNumber'],
        '+passwordHash'
      );
    account = identityLookup.account;
    role = identityLookup.role;
    if (identityLookup.ambiguous) {
      return res.status(409).json({ success: false, message: 'This email matches multiple SAPES accounts.' });
    }

    const { firstName, lastName } = getGoogleName(payload);
    if (studentMatch) {
      const institutionId = studentMatch[1];
      if (!firstName || !lastName) {
        return res.status(403).json({ success: false, message: 'Google account must provide a first and last name' });
      }
      if (account && role !== 'student') {
        return res.status(403).json({ success: false, message: 'Student Google accounts cannot use a non-student SAPES role' });
      }

      const student = account || await Student.findOne({ institutionId });
      if (student && student.institutionId !== institutionId) {
        return res.status(403).json({ success: false, message: 'Google account does not match the linked student ID' });
      }
      account = student;
      role = 'student';
      if (account && account.accountStatus !== 'active') {
        return res.status(403).json({ success: false, message: 'Account is not active' });
      }

      if (!account) {
        const enrollment = getDefaultStudentEnrollment();
        account = await Student.create({
          username: institutionId,
          institutionId,
          email,
          passwordHash: await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 12),
          googleId: payload.sub,
          role,
          accountStatus: 'active',
          enrollmentStatus: 'enrolled',
          yearLevel: enrollment.yearLevel,
          section: enrollment.section,
          personalInformation: { firstName, lastName },
          classification: { program: enrollment.program.name, studentType: 'regular' },
          enrollmentInformation: {
            course: enrollment.program.name,
            level: String(enrollment.yearLevel),
            yearLevel: String(enrollment.yearLevel)
          },
          academicStatus: { currentStatus: 'regular' }
        });
      } else {
        account.username = institutionId;
        account.email = email;
        account.googleId = payload.sub;
        account.personalInformation = account.personalInformation || {};
        account.personalInformation.firstName = firstName;
        account.personalInformation.lastName = lastName;
      }
    } else {
      if (!account || role === 'student') {
        return res.status(403).json({
          success: false,
          message: 'Google account must be provisioned by an administrator before sign-in'
        });
      }
      if (!emailMatchesRoleDomain(email, role)) {
        return res.status(403).json({ success: false, message: 'Google email does not match the assigned account role' });
      }
      if (account.accountStatus !== 'active') {
        return res.status(403).json({ success: false, message: 'Account is not active' });
      }
      account.googleId = payload.sub;
    }

    if (role === 'student') {
      account.contactInformation = account.contactInformation || {};
      account.contactInformation.institutionalEmail = email;
    }
    account.lastLoginAt = new Date();
    await account.save();

    return res.json({
      success: true,
      message: 'Google login successful',
      token: await createApplicationToken(account),
      user: safeUser(account)
    });
  } catch (error) {
    console.error('Google login error:', error);
    return res.status(500).json({ success: false, message: 'Google login failed' });
  }
});

module.exports = router;
