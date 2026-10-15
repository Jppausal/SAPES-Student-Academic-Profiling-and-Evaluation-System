const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
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
const INSTITUTIONAL_EMAIL_MESSAGE =
  'Use your institutional account: @student.buksu.edu.ph for students or @faculty.buksu.edu.ph for faculty';
const resetCodeHash = (code) => crypto.createHash('sha256').update(code).digest('hex');
const RESET_WINDOW_MS = 10 * 60 * 1000;
const RESET_REQUEST_INTERVAL_MS = 60 * 1000;

const emailMatchesRoleDomain = (email, role) => {
  const domain = ROLE_EMAIL_DOMAINS[role];
  return !domain || (
    typeof email === 'string'
    && email.trim().toLowerCase().endsWith(`@${domain}`)
  );
};

const getGoogleName = (payload) => {
  const nameParts = typeof payload.name === 'string'
    ? payload.name.trim().split(/\s+/).filter(Boolean)
    : [];
  const providedFirstName = typeof payload.given_name === 'string' && payload.given_name.trim()
    ? payload.given_name.trim()
    : '';
  const firstName = providedFirstName || nameParts[0] || '';
  if (providedFirstName) {
    const firstNameIndex = nameParts.findIndex(
      (part) => part.toLowerCase() === providedFirstName.toLowerCase()
    );
    nameParts.splice(0, firstNameIndex >= 0 ? firstNameIndex + 1 : 1);
  } else {
    nameParts.shift();
  }
  const lastName = typeof payload.family_name === 'string' && payload.family_name.trim()
    ? payload.family_name.trim()
    : nameParts.join(' ');

  return { firstName, lastName };
};

const getDefaultStudentEnrollment = () => {
  const program = TECHNOLOGY_PROGRAMS[crypto.randomInt(TECHNOLOGY_PROGRAMS.length)];
  const yearLevel = crypto.randomInt(1, 5);
  const section = String.fromCharCode(65 + crypto.randomInt(3));

  return {
    course: program.name,
    program: program.name,
    yearLevel,
    section: `${program.code}-${yearLevel}${section}`
  };
};

const createApplicationToken = async (user) => {
  const jti = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
  const token = jwt.sign(
    {
      jti,
      userId: user._id,
      role: user.role,
      username: user.username
    },
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

const safeUser = (user, studentNumber) => ({
  id: user._id,
  username: user.username,
  role: user.role,
  firstName: user.firstName || user.personalInformation?.firstName || '',
  lastName: user.lastName || user.personalInformation?.lastName || '',
  email: user.email || '',
  employeeId: user.employeeId || '',
  department: user.department || '',
  ...((studentNumber || user.studentNumber || user.institutionId)
    ? { studentNumber: studentNumber || user.studentNumber || user.institutionId }
    : {})
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // Check required fields
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username and password are required'
      });
    }

    // Prefer an email match, with username fallback for existing accounts.
    const loginIdentifier = username.trim();
    const normalizedEmail = loginIdentifier.toLowerCase();
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

    if (!account) {
      return res.status(401).json({
        success: false,
        message: 'Invalid username or password'
      });
    }
    if (account.role && account.role !== role) {
      return res.status(403).json({
        success: false,
        message: 'Account role does not match its role-specific collection'
      });
    }
    if (!account.role) account.role = role;

    if (
      !emailMatchesRoleDomain(account.email, account.role)
      || (
        loginIdentifier.includes('@')
        && !emailMatchesRoleDomain(loginIdentifier, account.role)
      )
    ) {
      return res.status(403).json({
        success: false,
        message: INSTITUTIONAL_EMAIL_MESSAGE
      });
    }

    // Check account status
    if (account.accountStatus !== 'active') {
      return res.status(403).json({
        success: false,
        message: 'Account is not active'
      });
    }

    // Compare password. Support older local accounts whose passwordHash was stored as plain text.
    const passwordMatch = await bcrypt.compare(password, account.passwordHash).catch(() => false);
    const legacyPasswordMatch = !passwordMatch && account.passwordHash === password;

    if (!passwordMatch && !legacyPasswordMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid username or password'
      });
    }

    if (legacyPasswordMatch && account.passwordHash === password) {
      account.passwordHash = await bcrypt.hash(password, 12);
      await account.save();
    }

    // Create JWT
    const token = await createApplicationToken(account);

    // Update last login
    account.lastLoginAt = new Date();
    await account.save();

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: safeUser(account, account.studentNumber)
    });

  } catch (error) {
    console.error('Login error:', error);

    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// POST /api/auth/logout
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

router.post('/password-reset/request', async (req, res) => {
  const genericResponse = { success: true, message: 'If the account is eligible, a verification code has been sent to its registered institutional email.' };
  try {
    const username = typeof req.body?.username === 'string' ? req.body.username.trim() : '';
    if (!username) return res.status(400).json({ success: false, message: 'Username or institution ID is required' });
    const { account: user } = await findAccountByIdentifier(
      username,
      ['username', 'institutionId', 'studentNumber'],
      '+passwordResetRequestedAt'
    );
    if (!user || user.accountStatus !== 'active' || !user.email) return res.json(genericResponse);
    if (user.passwordResetRequestedAt && Date.now() - user.passwordResetRequestedAt.getTime() < RESET_REQUEST_INTERVAL_MS) return res.json(genericResponse);
    const code = crypto.randomInt(100000, 1000000).toString();
    user.passwordResetCodeHash = resetCodeHash(code);
    user.passwordResetExpiresAt = new Date(Date.now() + RESET_WINDOW_MS);
    user.passwordResetAttempts = 0;
    user.passwordResetRequestedAt = new Date();
    await user.save();
    await sendPasswordResetCode(user.email, code);
    return res.json(genericResponse);
  } catch (error) {
    console.error('Password reset request error:', error);
    return res.status(503).json({ success: false, message: 'Password reset email is currently unavailable' });
  }
});

router.get('/settings', authenticateToken, async (req, res) => {
  const AccountModel = getAccountModel(req.user.role);
  const user = await AccountModel.findById(req.user.userId).select('notificationPreferences').lean();
  return res.json({ success: true, data: { notificationPreferences: user?.notificationPreferences || { profileAndAcademicUpdates: true } } });
});

router.put('/settings', authenticateToken, async (req, res) => {
  const value = req.body?.notificationPreferences?.profileAndAcademicUpdates;
  if (typeof value !== 'boolean') return res.status(400).json({ success: false, message: 'notification preference must be a boolean' });
  const AccountModel = getAccountModel(req.user.role);
  await AccountModel.findByIdAndUpdate(req.user.userId, { 'notificationPreferences.profileAndAcademicUpdates': value });
  return res.json({ success: true, data: { notificationPreferences: { profileAndAcademicUpdates: value } } });
});

router.post('/password-reset/confirm', async (req, res) => {
  try {
    const { resetAuthorization, newPassword } = req.body || {};
    if (typeof resetAuthorization !== 'string' || typeof newPassword !== 'string' || newPassword.length < 8) return res.status(400).json({ success: false, message: 'Verified reset authorization and a password of at least 8 characters are required' });
    let authorization;
    try { authorization = jwt.verify(resetAuthorization, process.env.JWT_SECRET); } catch { return res.status(400).json({ success: false, message: 'Password-reset verification has expired. Request a new code.' }); }
    if (authorization.purpose !== 'password_reset' || !authorization.userId) return res.status(400).json({ success: false, message: 'Invalid password-reset verification' });
    const AccountModel = getAccountModel(authorization.role);
    const user = AccountModel ? await AccountModel.findById(authorization.userId) : null;
    if (!user || user.accountStatus !== 'active') return res.status(400).json({ success: false, message: 'Password-reset verification is no longer valid' });
    user.passwordHash = await bcrypt.hash(newPassword, 12);
    user.passwordResetCodeHash = undefined; user.passwordResetExpiresAt = undefined; user.passwordResetAttempts = 0;
    await user.save();
    await SessionToken.updateMany(
      { userId: user._id, accountRole: user.role, revokedAt: null },
      { revokedAt: new Date() }
    );
    return res.json({ success: true, message: 'Password updated. Please log in with your new password.' });
  } catch (error) {
    console.error('Password reset confirmation error:', error);
    return res.status(500).json({ success: false, message: 'Unable to update password' });
  }
});

router.post('/password-reset/verify', async (req, res) => {
  const { username, code } = req.body || {};
  if (typeof username !== 'string' || typeof code !== 'string') return res.status(400).json({ success: false, message: 'Username and verification code are required' });
  const { account: user, role, ambiguous } = await findAccountByIdentifier(
    username.trim(),
    ['username', 'institutionId', 'studentNumber'],
    '+passwordResetCodeHash +passwordResetExpiresAt +passwordResetAttempts'
  );
  if (ambiguous) return res.json({ success: true, message: 'If the account is eligible, the code is valid.' });
  const matches = user?.passwordResetCodeHash && crypto.timingSafeEqual(Buffer.from(user.passwordResetCodeHash), Buffer.from(resetCodeHash(code)));
  if (!user || !matches || !user.passwordResetExpiresAt || user.passwordResetExpiresAt <= new Date() || user.passwordResetAttempts >= 5) { if (user) { user.passwordResetAttempts = (user.passwordResetAttempts || 0) + 1; await user.save(); } return res.status(400).json({ success: false, message: 'The verification code is invalid or expired' }); }
  user.passwordResetCodeHash = undefined; user.passwordResetExpiresAt = undefined; user.passwordResetAttempts = 0; await user.save();
  return res.json({ success: true, resetAuthorization: jwt.sign({ purpose: 'password_reset', userId: user._id, role }, process.env.JWT_SECRET, { expiresIn: '10m' }) });
});

// GET /api/auth/session
router.get('/session', authenticateToken, async (req, res) => {
  try {
    const AccountModel = getAccountModel(req.user.role);
    const user = await AccountModel.findById(req.user.userId)
      .select('username role firstName lastName email studentNumber institutionId personalInformation employeeId department')
      .lean();
    if (!user) {
      return res.status(401).json({ success: false, message: 'Account no longer exists' });
    }

    return res.json({
      success: true,
      user: safeUser(user, user.studentNumber)
    });
  } catch (error) {
    console.error('Session lookup error:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/auth/google
router.post('/google', async (req, res) => {
  try {
    const { credential } = req.body;

    if (!credential || typeof credential !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Google credential is required'
      });
    }

    if (!process.env.GOOGLE_CLIENT_ID) {
      console.error('Google authentication is not configured: GOOGLE_CLIENT_ID is missing');
      return res.status(503).json({
        success: false,
        message: 'Google authentication is not configured'
      });
    }

    const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
    let ticket;
    try {
      ticket = await client.verifyIdToken({
        idToken: credential,
        audience: process.env.GOOGLE_CLIENT_ID
      });
    } catch (verificationError) {
      console.warn('Google token verification failed:', verificationError.message);
      return res.status(401).json({
        success: false,
        message: 'Google account verification failed'
      });
    }
    const payload = ticket.getPayload();

    if (!payload) {
      console.error('[Google] No payload');
      return res.status(401).json({ success: false, message: 'Google account verification failed' });
    }
    const checks = {
      hasSub: !!payload.sub,
      hasEmail: !!payload.email,
      emailVerified: payload.email_verified === true,
      validIssuer: GOOGLE_ISSUERS.has(payload.iss),
      validAudience: payload.aud === process.env.GOOGLE_CLIENT_ID,
      notExpired: typeof payload.exp === 'number' && payload.exp > Math.floor(Date.now() / 1000),
      correctDomain: GOOGLE_ALLOWED_DOMAINS.has(payload.hd),
    };
    console.info('[Google] Payload checks:', checks, '| email:', payload.email, '| hd:', payload.hd);
    if (
      checks.hasSub
      && checks.hasEmail
      && checks.emailVerified
      && checks.validIssuer
      && checks.validAudience
      && checks.notExpired
      && !checks.correctDomain
    ) {
      return res.status(403).json({
        success: false,
        message: INSTITUTIONAL_EMAIL_MESSAGE
      });
    }
    if (Object.values(checks).some((v) => !v)) {
      return res.status(401).json({
        success: false,
        message: 'Google account verification failed'
      });
    }

    const email = payload.email.toLowerCase();
    const studentEmailMatch = email.match(/^([0-9]{10})@student\.buksu\.edu\.ph$/);
    const googleAccountLookup = await findAccountByGoogleId(payload.sub);
    if (googleAccountLookup.ambiguous) {
      return res.status(409).json({
        success: false,
        message: 'This Google account is linked to multiple SAPES accounts. Contact an administrator.'
      });
    }
    let user = googleAccountLookup.account;
    let userRole = googleAccountLookup.role;

    if (email.endsWith('@student.buksu.edu.ph') && !studentEmailMatch) {
      return res.status(403).json({
        success: false,
        message: 'Student Google account must use a 10-digit ID before @student.buksu.edu.ph'
      });
    }

    if (studentEmailMatch) {
      const institutionId = studentEmailMatch[1];
      const { firstName, lastName } = getGoogleName(payload);
      if (!firstName || !lastName) {
        return res.status(403).json({
          success: false,
          message: 'Google account must provide a first and last name'
        });
      }

      const student = await Student.findOne({ institutionId });
      if (user && userRole !== 'student') {
        return res.status(403).json({
          success: false,
          message: 'Student Google accounts cannot use a non-student SAPES role'
        });
      }
      if (!user && student) {
        user = student;
        userRole = 'student';
      }
      if (!user) {
        const lookup = await findAccountByIdentifier(
          institutionId,
          ['institutionId', 'studentNumber', 'username', 'email']
        );
        if (lookup.ambiguous) {
          return res.status(409).json({
            success: false,
            message: 'The student identifier matches multiple SAPES accounts. Contact an administrator.'
          });
        }
        user = lookup.account;
        userRole = lookup.role;
      }
      if (student && user && String(student._id) !== String(user._id)) {
        return res.status(403).json({
          success: false,
          message: 'Student record is already linked to a different SAPES account'
        });
      }
      if (user && userRole !== 'student') {
        return res.status(403).json({
          success: false,
          message: 'The linked SAPES account is not a student account'
        });
      }
      if (user && user.accountStatus !== 'active') {
        return res.status(403).json({
          success: false,
          message: 'Account is not active'
        });
      }
      if ((user?.studentNumber || user?.institutionId) &&
          (user.studentNumber || user.institutionId) !== institutionId) {
        return res.status(403).json({
          success: false,
          message: 'Google account does not match the linked student ID'
        });
      }

      let createdUser = false;
      if (!user) {
        user = await Student.create({
          username: institutionId,
          institutionId,
          email,
          studentNumber: institutionId,
          passwordHash: await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 12),
          googleId: payload.sub,
          role: 'student',
          accountStatus: 'active',
          enrollmentStatus: 'enrolled',
          personalInformation: { firstName, lastName },
          classification: { studentType: 'regular' }
        });
        userRole = 'student';
        createdUser = true;
      }

      try {
        if (!student) {
          const enrollment = getDefaultStudentEnrollment();
          user.yearLevel = enrollment.yearLevel;
          user.section = enrollment.section;
          user.enrollmentStatus = 'enrolled';
          user.classification.program = enrollment.program;
          user.classification.studentType = user.classification.studentType || 'regular';
          user.enrollmentInformation.course = enrollment.course;
          user.enrollmentInformation.level = String(enrollment.yearLevel);
          user.enrollmentInformation.yearLevel = String(enrollment.yearLevel);
          user.academicStatus.currentStatus = 'regular';
        }
        user.username = institutionId;
        user.institutionId = institutionId;
        user.studentNumber = institutionId;
        user.email = email;
        user.googleId = payload.sub;
        user.personalInformation = user.personalInformation || {};
        user.personalInformation.firstName = firstName;
        user.personalInformation.lastName = lastName;
        await user.save();
      } catch (profileError) {
        if (createdUser) {
          await Student.deleteOne({ _id: user._id });
        }
        throw profileError;
      }

      user.googleId = payload.sub;
      user.username = institutionId;
      user.studentNumber = institutionId;
      user.email = email;
    } else {
      if (userRole === 'student') {
        return res.status(403).json({
          success: false,
          message: 'Student Google account must use the institutional student email format'
        });
      }
      if (!user) {
        const lookup = await findAccountByIdentifier(email, ['email', 'username']);
        if (lookup.ambiguous) {
          return res.status(409).json({
            success: false,
            message: 'This email matches multiple SAPES accounts. Contact an administrator.'
          });
        }
        user = lookup.account;
        userRole = lookup.role;
      }
      if (!user || userRole === 'student') {
        return res.status(403).json({
          success: false,
          message: 'Google account must be provisioned by an administrator before sign-in'
        });
      }
      if (user.accountStatus !== 'active') {
        return res.status(403).json({
          success: false,
          message: 'Account is not active'
        });
      }
      user.googleId = payload.sub;
    }

    user.role = userRole;
    if (!emailMatchesRoleDomain(email, user.role)) {
      return res.status(403).json({
        success: false,
        message: INSTITUTIONAL_EMAIL_MESSAGE
      });
    }
    if (user.role === 'faculty') {
      user.email = email;
    }

    user.lastLoginAt = new Date();
    await user.save();

    return res.json({
      success: true,
      message: 'Google login successful',
      token: await createApplicationToken(user),
      user: safeUser(user, studentEmailMatch?.[1])
    });
  } catch (error) {
    console.error('Google login error:', error);
    return res.status(500).json({
      success: false,
      message: 'Google login failed'
    });
  }
});

module.exports = router;
