const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { OAuth2Client } = require('google-auth-library');
const User = require('../models/User');
const Student = require('../models/Student');
const SessionToken = require('../models/SessionToken');
const authenticateToken = require('../middleware/authMiddleware');
const { sendPasswordResetCode } = require('../utils/email');
const {
  extractStudentInstitutionId,
  normalizeInstitutionalEmail
} = require('../utils/institutionalIdentity');

const router = express.Router();
const GOOGLE_ALLOWED_DOMAINS = new Set(['buksu.edu.ph', 'student.buksu.edu.ph']);
const GOOGLE_ISSUERS = new Set(['accounts.google.com', 'https://accounts.google.com']);
const resetCodeHash = (code) => crypto.createHash('sha256').update(code).digest('hex');
const RESET_WINDOW_MS = 10 * 60 * 1000;
const RESET_REQUEST_INTERVAL_MS = 60 * 1000;

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

  await SessionToken.create({ jti, userId: user._id, expiresAt });
  return token;
};

const safeUser = (user, studentNumber) => ({
  id: user._id,
  username: user.username,
  role: user.role,
  firstName: user.firstName || '',
  lastName: user.lastName || '',
  email: user.email || '',
  employeeId: user.employeeId || '',
  department: user.department || '',
  ...(studentNumber ? { studentNumber } : {})
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
    const emailLocalPart = loginIdentifier.includes('@')
      ? loginIdentifier.slice(0, loginIdentifier.indexOf('@'))
      : loginIdentifier;

    const user = await User.findOne({ email: normalizedEmail })
      || await User.findOne({ username: loginIdentifier })
      || (emailLocalPart !== loginIdentifier
        ? await User.findOne({ username: emailLocalPart })
        : null);

    const student = !user ? await Student.findOne({
      $or: [
        { email: normalizedEmail },
        { username: loginIdentifier },
        { username: loginIdentifier.toLowerCase() },
        { institutionId: loginIdentifier },
        ...(emailLocalPart !== loginIdentifier ? [
          { username: emailLocalPart },
          { username: emailLocalPart.toLowerCase() }
        ] : [])
      ]
    }) : null;

    const account = user || (student ? {
      _id: student._id,
      username: student.username || student.institutionId,
      role: student.role || 'student',
      firstName: student.personalInformation?.firstName || student.firstName || '',
      lastName: student.personalInformation?.lastName || student.lastName || '',
      email: student.email || '',
      studentNumber: student.institutionId || '',
      employeeId: '',
      department: '',
      accountStatus: student.accountStatus || 'active',
      passwordHash: student.passwordHash || '',
      save: async () => {
        await student.save();
      }
    } : null);

    if (!account) {
      return res.status(401).json({
        success: false,
        message: 'Invalid username or password'
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
    const user = await User.findOne({ username }).select('+passwordResetRequestedAt');
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
  const user = await User.findById(req.user.userId).select('notificationPreferences').lean();
  return res.json({ success: true, data: { notificationPreferences: user?.notificationPreferences || { profileAndAcademicUpdates: true } } });
});

router.put('/settings', authenticateToken, async (req, res) => {
  const value = req.body?.notificationPreferences?.profileAndAcademicUpdates;
  if (typeof value !== 'boolean') return res.status(400).json({ success: false, message: 'notification preference must be a boolean' });
  await User.findByIdAndUpdate(req.user.userId, { 'notificationPreferences.profileAndAcademicUpdates': value });
  return res.json({ success: true, data: { notificationPreferences: { profileAndAcademicUpdates: value } } });
});

router.post('/password-reset/confirm', async (req, res) => {
  try {
    const { resetAuthorization, newPassword } = req.body || {};
    if (typeof resetAuthorization !== 'string' || typeof newPassword !== 'string' || newPassword.length < 8) return res.status(400).json({ success: false, message: 'Verified reset authorization and a password of at least 8 characters are required' });
    let authorization;
    try { authorization = jwt.verify(resetAuthorization, process.env.JWT_SECRET); } catch { return res.status(400).json({ success: false, message: 'Password-reset verification has expired. Request a new code.' }); }
    if (authorization.purpose !== 'password_reset' || !authorization.userId || typeof authorization.nonce !== 'string') return res.status(400).json({ success: false, message: 'Invalid password-reset verification' });
    // Consume the verified authorization atomically so concurrent requests and replay fail.
    const user = await User.findOneAndUpdate({
      _id: authorization.userId,
      accountStatus: 'active',
      passwordResetCodeHash: resetCodeHash(authorization.nonce),
      passwordResetExpiresAt: { $gt: new Date() }
    }, {
      $set: { passwordHash: await bcrypt.hash(newPassword, 12), passwordResetAttempts: 0 },
      $unset: { passwordResetCodeHash: 1, passwordResetExpiresAt: 1 }
    }, { returnDocument: 'after' });
    if (!user) return res.status(400).json({ success: false, message: 'Password-reset verification is no longer valid' });
    await SessionToken.updateMany({ userId: user._id, revokedAt: null }, { revokedAt: new Date() });
    return res.json({ success: true, message: 'Password updated. Please log in with your new password.' });
  } catch (error) {
    console.error('Password reset confirmation error:', error);
    return res.status(500).json({ success: false, message: 'Unable to update password' });
  }
});

router.post('/password-reset/verify', async (req, res) => {
  const { username, code } = req.body || {};
  if (typeof username !== 'string' || typeof code !== 'string') return res.status(400).json({ success: false, message: 'Username and verification code are required' });
  const user = await User.findOne({ username: username.trim() }).select('+passwordResetCodeHash +passwordResetExpiresAt +passwordResetAttempts');
  const matches = user?.passwordResetCodeHash && crypto.timingSafeEqual(Buffer.from(user.passwordResetCodeHash), Buffer.from(resetCodeHash(code)));
  if (!user || user.accountStatus !== 'active' || !matches || !user.passwordResetExpiresAt || user.passwordResetExpiresAt <= new Date() || user.passwordResetAttempts >= 5) { if (user) { user.passwordResetAttempts = (user.passwordResetAttempts || 0) + 1; await user.save(); } return res.status(400).json({ success: false, message: 'The verification code is invalid or expired' }); }
  const nonce = crypto.randomBytes(32).toString('hex');
  const verified = await User.findOneAndUpdate({
    _id: user._id, accountStatus: 'active', passwordResetCodeHash: resetCodeHash(code),
    passwordResetExpiresAt: { $gt: new Date() }, passwordResetAttempts: { $lt: 5 }
  }, { $set: { passwordResetCodeHash: resetCodeHash(nonce), passwordResetExpiresAt: new Date(Date.now() + RESET_WINDOW_MS), passwordResetAttempts: 0 } });
  if (!verified) return res.status(400).json({ success: false, message: 'The verification code is invalid or expired' });
  return res.json({ success: true, resetAuthorization: jwt.sign({ purpose: 'password_reset', userId: user._id, nonce }, process.env.JWT_SECRET, { expiresIn: '10m' }) });
});

// GET /api/auth/session
router.get('/session', authenticateToken, async (req, res) => {
  try {
    let user = await User.findById(req.user.userId)
      .select('username role firstName lastName email studentNumber employeeId department')
      .lean();
    if (!user && req.user.role === 'student') {
      const student = await Student.findById(req.user.userId)
        .select('username role email institutionId personalInformation')
        .lean();
      if (student) {
        user = {
          ...student,
          firstName: student.personalInformation?.firstName || '',
          lastName: student.personalInformation?.lastName || '',
          studentNumber: student.institutionId,
          employeeId: '',
          department: ''
        };
      }
    }
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
    console.info('[Google] Payload checks:', checks, '| hd:', payload.hd);
    if (Object.values(checks).some((v) => !v)) {
      return res.status(401).json({
        success: false,
        message: 'Google account verification failed'
      });
    }

    const email = normalizeInstitutionalEmail(payload.email);
    const studentInstitutionId = extractStudentInstitutionId(email);
    let user = await User.findOne({ googleId: payload.sub });

    if (user) {
      if (user.accountStatus !== 'active') {
        return res.status(403).json({
          success: false,
          message: 'Account is not active'
        });
      }

      if (user.role === 'student') {
        if (!studentInstitutionId) {
          return res.status(403).json({
            success: false,
            message: 'Student Google account must use the institutional student email format'
          });
        }
        const linkedStudent = await Student.findOne({
          institutionId: studentInstitutionId,
          userId: user._id
        }).select('institutionId');
        if (!linkedStudent) {
          return res.status(403).json({
            success: false,
            message: 'Google account is not linked to the matching student record'
          });
        }
        user.username = linkedStudent.institutionId;
        user.studentNumber = linkedStudent.institutionId;
        user.email = email;
      } else if (studentInstitutionId) {
        return res.status(403).json({
          success: false,
          message: 'Student Google accounts cannot use a non-student SAPES role'
        });
      }
    } else if (studentInstitutionId) {
      const institutionId = studentInstitutionId;
      const student = await Student.findOne({ institutionId });

      user = student?.userId ? await User.findById(student.userId) : null;
      if (user && user.role !== 'student') {
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

      if (!user) {
        user = await User.create({
          username: institutionId,
          email,
          studentNumber: institutionId,
          passwordHash: await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 12),
          googleId: payload.sub,
          role: 'student',
          accountStatus: 'active'
        });

        try {
          if (student) {
            student.userId = user._id;
            await student.save();
          } else {
            await Student.create({
              userId: user._id,
              institutionId,
              personalInformation: {
                firstName: 'New',
                lastName: 'Student'
              },
              classification: {
                studentType: 'regular'
              },
              academicStatus: {
                currentStatus: 'regular'
              }
            });
          }
        } catch (profileError) {
          await User.deleteOne({ _id: user._id });
          throw profileError;
        }
      } else {
        user.googleId = payload.sub;
        await user.save();
      }
    } else {
      user = await User.findOne({ username: email });
      if (!user || user.role === 'student') {
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
      await user.save();
    }

    user.lastLoginAt = new Date();
    await user.save();

    return res.json({
      success: true,
      message: 'Google login successful',
      token: await createApplicationToken(user),
      user: safeUser(user, studentInstitutionId)
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
