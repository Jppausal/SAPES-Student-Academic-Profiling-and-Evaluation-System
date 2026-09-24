const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { OAuth2Client } = require('google-auth-library');
const User = require('../models/User');
const Student = require('../models/Student');
const SessionToken = require('../models/SessionToken');
const authenticateToken = require('../middleware/authMiddleware');

const router = express.Router();
const GOOGLE_ALLOWED_DOMAINS = new Set(['buksu.edu.ph', 'student.buksu.edu.ph']);
const GOOGLE_ISSUERS = new Set(['accounts.google.com', 'https://accounts.google.com']);

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

    // Find user
    const user = await User.findOne({ username });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid username or password'
      });
    }

    // Check account status
    if (user.accountStatus !== 'active') {
      return res.status(403).json({
        success: false,
        message: 'Account is not active'
      });
    }

    // Compare password
    const passwordMatch = await bcrypt.compare(
      password,
      user.passwordHash
    );

    if (!passwordMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid username or password'
      });
    }

    // Create JWT
    const token = await createApplicationToken(user);

    // Update last login
    user.lastLoginAt = new Date();
    await user.save();

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        username: user.username,
        role: user.role
      }
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
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID
    });
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
    if (Object.values(checks).some((v) => !v)) {
      return res.status(401).json({
        success: false,
        message: 'Google account verification failed'
      });
    }

    const email = payload.email.toLowerCase();
    const studentEmailMatch = email.match(/^([0-9]+)@student\.buksu\.edu\.ph$/);
    let user = await User.findOne({ googleId: payload.sub });

    if (user) {
      if (user.accountStatus !== 'active') {
        return res.status(403).json({
          success: false,
          message: 'Account is not active'
        });
      }

      if (user.role === 'student') {
        if (!studentEmailMatch) {
          return res.status(403).json({
            success: false,
            message: 'Student Google account must use the institutional student email format'
          });
        }
        const linkedStudent = await Student.findOne({
          institutionId: studentEmailMatch[1],
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
      } else if (studentEmailMatch) {
        return res.status(403).json({
          success: false,
          message: 'Student Google accounts cannot use a non-student SAPES role'
        });
      }
    } else if (studentEmailMatch) {
      const institutionId = studentEmailMatch[1];
      const student = await Student.findOne({ institutionId });

      user = student?.userId ? await User.findById(student.userId) : null;
      if (user && user.role !== 'student') {
        return res.status(403).json({
          success: false,
          message: 'The linked SAPES account is not a student account'
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
      user: safeUser(user, studentEmailMatch?.[1])
    });
  } catch (error) {
    console.error('Google login error:', error.message, error.stack);
    return res.status(500).json({
      success: false,
      message: error.message || 'Google login failed'
    });
  }
});

module.exports = router;