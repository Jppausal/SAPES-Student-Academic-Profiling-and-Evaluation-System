const crypto = require('node:crypto');
const router = require('express').Router();
const SystemSettings = require('../models/SystemSettings');
const AdminUser = require('../models/AdminUser');
const CredentialMfaToken = require('../models/CredentialMfaToken');
const AuditLog = require('../models/AuditLog');
const authenticate = require('../middleware/authMiddleware');
const roles = require('../middleware/roleMiddleware');
const { authorizePermission } = require('../middleware/permissionMiddleware');
const { readSettings, configuration, maskCredential } = require('../utils/systemSettings');
const { generatePassword } = require('../utils/passwordGenerator');
const { updateEnvVariable, removeEnvVariable } = require('../utils/envConfig');
const { sendCredentialMfaCode } = require('../utils/email');
const { validateCredential } = require('../utils/credentialValidator');

router.use((_req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});

// Helper to mask recipient email for display (e.g. a***n@buksu.edu.ph)
function maskEmail(email) {
  if (!email || typeof email !== 'string' || !email.includes('@')) return email || '';
  const [user, domain] = email.split('@');
  if (user.length <= 2) {
    return `${user[0]}*@${domain}`;
  }
  const maskedUser = user[0] + '*'.repeat(Math.max(1, user.length - 2)) + user.slice(-1);
  return `${maskedUser}@${domain}`;
}

const INTEGRATION_TITLES = {
  googleAuth: 'Google Sign-In',
  recaptcha: 'reCAPTCHA Verification',
  passwordGenerator: 'API Ninjas Password Generator'
};

// Public projection contains only feature flags and public configuration values.
router.get('/public', async (_req, res) => {
  try {
    res.json({ success: true, data: await readSettings({ admin: false }) });
  } catch {
    res.status(503).json({ success: false, message: 'Integration settings are unavailable.' });
  }
});

router.use(authenticate, roles('admin'), authorizePermission('manage_users'));

router.get('/', async (_req, res) => {
  try {
    res.json({ success: true, data: await readSettings({ admin: true }) });
  } catch {
    res.status(503).json({ success: false, message: 'Unable to load settings.' });
  }
});

router.post('/generate-password', async (req, res) => {
  try {
    const result = await generatePassword({ length: req.query.length });
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || 'Failed to generate password.' });
  }
});

router.put('/', async (req, res) => {
  try {
    const body = req.body;
    const integrations = body?.integrations;
    if (
      !body ||
      Object.keys(body).some((key) => key !== 'integrations') ||
      !integrations ||
      typeof integrations !== 'object' ||
      Array.isArray(integrations) ||
      !Object.keys(integrations).length
    ) {
      return res.status(400).json({ success: false, message: 'Provide integration settings only.' });
    }
    const configured = configuration();
    const updates = {};
    for (const [name, value] of Object.entries(integrations)) {
      if (
        !Object.hasOwn(configured, name) ||
        !value ||
        typeof value !== 'object' ||
        Object.keys(value).length !== 1 ||
        typeof value.enabled !== 'boolean'
      ) {
        return res.status(400).json({ success: false, message: 'Unsupported setting or invalid enabled value.' });
      }
      if (value.enabled && !configured[name]) {
        return res.status(400).json({ success: false, message: `${name} is not configured or unavailable.` });
      }
      updates[`integrations.${name}.enabled`] = value.enabled;
    }
    // Atomic update returns the actual previous state, including concurrent changes.
    const before = await SystemSettings.findOneAndUpdate(
      { _id: 'system' },
      { $set: { ...updates, updatedBy: req.user.userId } },
      { upsert: true, new: false, runValidators: true }
    );
    const changes = Object.entries(integrations)
      .map(([name, value]) => ({
        setting: name,
        oldEnabled: before?.integrations?.[name]?.enabled ?? (name !== 'recaptcha'),
        newEnabled: value.enabled
      }))
      .filter((change) => change.oldEnabled !== change.newEnabled);

    await AuditLog.create({
      userId: req.user.userId,
      userRole: 'admin',
      userModel: 'AdminUser',
      action: 'SYSTEM_SETTINGS_UPDATED',
      targetType: 'system_settings',
      details: { changes }
    });

    res.json({ success: true, data: await readSettings({ admin: true }) });
  } catch {
    res.status(500).json({ success: false, message: 'Unable to save settings. Reload to check current values.' });
  }
});

// Endpoint to dispatch a 6-digit MFA security verification code to administrator email
router.post('/credentials/send-mfa', async (req, res) => {
  try {
    const { integration } = req.body || {};
    const allowedIntegrations = ['googleAuth', 'recaptcha', 'passwordGenerator'];

    if (!integration || !allowedIntegrations.includes(integration)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or unsupported integration specified for MFA verification.'
      });
    }

    const admin = await AdminUser.findById(req.user.userId).select('email').lean();
    const recipientEmail = (admin?.email || process.env.SMTP_USER || process.env.SMTP_FROM || 'lolenseu.maureal@gmail.com').trim();

    if (!recipientEmail) {
      return res.status(400).json({
        success: false,
        message: 'No administrator email found to receive the MFA verification code. Please configure an email in your admin profile.'
      });
    }

    // Cooldown rate-limiting: 30 seconds between requests for this integration & user
    const existing = await CredentialMfaToken.findOne({
      userId: req.user.userId,
      integration,
      expiresAt: { $gt: new Date() }
    }).sort({ createdAt: -1 });

    if (existing && Date.now() - new Date(existing.createdAt).getTime() < 30000) {
      const waitSeconds = Math.ceil((30000 - (Date.now() - new Date(existing.createdAt).getTime())) / 1000);
      return res.status(429).json({
        success: false,
        message: `Please wait ${waitSeconds} seconds before requesting a new verification code.`
      });
    }

    // Generate cryptographically secure 6-digit verification code
    const code = String(crypto.randomInt(100000, 1000000));
    const codeHash = crypto.createHash('sha256').update(code).digest('hex');
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Clear any previous active tokens for this user & integration, then create new one
    await CredentialMfaToken.deleteMany({ userId: req.user.userId, integration });
    await CredentialMfaToken.create({
      userId: req.user.userId,
      integration,
      codeHash,
      recipientEmail,
      expiresAt
    });

    const integrationTitle = INTEGRATION_TITLES[integration] || integration;
    await sendCredentialMfaCode(recipientEmail, code, integrationTitle);

    res.json({
      success: true,
      message: `MFA verification code successfully sent to ${maskEmail(recipientEmail)}.`,
      data: {
        maskedEmail: maskEmail(recipientEmail),
        expiresInSeconds: 600
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Unable to send MFA verification code. Ensure SMTP is configured.'
    });
  }
});

// Endpoint to customize or revert integration credentials (API keys, client IDs) with MFA and pre-flight try-catch validation
router.put('/credentials', async (req, res) => {
  try {
    const { integration, customKey, customSecretKey, reset, mfaCode } = req.body || {};
    const allowedIntegrations = ['googleAuth', 'recaptcha', 'passwordGenerator'];

    if (!integration || !allowedIntegrations.includes(integration)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or unsupported integration specified for credential customization.'
      });
    }

    // Enforce MFA2 verification code
    if (!mfaCode || typeof mfaCode !== 'string' || !mfaCode.trim()) {
      return res.status(400).json({
        success: false,
        message: 'A 6-digit MFA verification code is required to authorize changing API credentials.'
      });
    }

    const trimmedMfa = mfaCode.trim();
    const mfaRecord = await CredentialMfaToken.findOne({
      userId: req.user.userId,
      integration,
      expiresAt: { $gt: new Date() }
    });

    if (!mfaRecord) {
      return res.status(400).json({
        success: false,
        message: 'No active MFA verification code found. Please request a new code via email.'
      });
    }

    const submittedHash = crypto.createHash('sha256').update(trimmedMfa).digest('hex');
    if (submittedHash !== mfaRecord.codeHash) {
      mfaRecord.attempts = (mfaRecord.attempts || 0) + 1;
      if (mfaRecord.attempts >= 5) {
        await CredentialMfaToken.deleteOne({ _id: mfaRecord._id });
        return res.status(400).json({
          success: false,
          message: 'Too many incorrect MFA code attempts. This verification code has been invalidated. Please request a new code.'
        });
      }
      await mfaRecord.save();
      return res.status(400).json({
        success: false,
        message: 'Invalid MFA verification code. Please check your email and try again.'
      });
    }

    const isReset = reset === true || customKey === '';
    const updates = {};
    const auditDetails = { integration, isReset };
    let trimmedKey = '';
    let trimmedSecret = '';

    if (!isReset) {
      if (typeof customKey !== 'string' || !customKey.trim()) {
        return res.status(400).json({
          success: false,
          message: 'A valid credential key string is required.'
        });
      }
      trimmedKey = customKey.trim();
      trimmedSecret = typeof customSecretKey === 'string' ? customSecretKey.trim() : '';

      // Pre-flight try-catch validation before allowing customization
      try {
        await validateCredential(integration, trimmedKey, trimmedSecret);
      } catch (validationErr) {
        return res.status(400).json({
          success: false,
          message: `Credential validation failed: ${validationErr.message}`
        });
      }
    }

    // Validation passed: invalidate single-use token to prevent replay
    await CredentialMfaToken.deleteOne({ _id: mfaRecord._id });

    if (isReset) {
      if (integration === 'googleAuth') {
        removeEnvVariable('CUSTOM_CLIENT_ID');
        updates['integrations.googleAuth.customClientId'] = '';
      } else if (integration === 'recaptcha') {
        removeEnvVariable('CUSTOM_RECAPTCHA_SITE_KEY');
        removeEnvVariable('CUSTOM_RECAPTCHA_SECRET_KEY');
        updates['integrations.recaptcha.customSiteKey'] = '';
        updates['integrations.recaptcha.customSecretKey'] = '';
      } else if (integration === 'passwordGenerator') {
        removeEnvVariable('CUSTOM_API_NINJAS_KEY');
        updates['integrations.passwordGenerator.customApiKey'] = '';
      }
    } else {
      if (integration === 'googleAuth') {
        updateEnvVariable('CUSTOM_CLIENT_ID', trimmedKey);
        updates['integrations.googleAuth.customClientId'] = trimmedKey;
        auditDetails.maskedKey = maskCredential(trimmedKey);
      } else if (integration === 'recaptcha') {
        updateEnvVariable('CUSTOM_RECAPTCHA_SITE_KEY', trimmedKey);
        updates['integrations.recaptcha.customSiteKey'] = trimmedKey;
        auditDetails.maskedSiteKey = maskCredential(trimmedKey);
        if (trimmedSecret) {
          updateEnvVariable('CUSTOM_RECAPTCHA_SECRET_KEY', trimmedSecret);
          updates['integrations.recaptcha.customSecretKey'] = trimmedSecret;
          auditDetails.maskedSecretKey = maskCredential(trimmedSecret);
        }
      } else if (integration === 'passwordGenerator') {
        updateEnvVariable('CUSTOM_API_NINJAS_KEY', trimmedKey);
        updates['integrations.passwordGenerator.customApiKey'] = trimmedKey;
        auditDetails.maskedKey = maskCredential(trimmedKey);
      }
    }

    await SystemSettings.findOneAndUpdate(
      { _id: 'system' },
      { $set: { ...updates, updatedBy: req.user.userId } },
      { upsert: true, new: true, runValidators: true }
    );

    await AuditLog.create({
      userId: req.user.userId,
      userRole: 'admin',
      userModel: 'AdminUser',
      action: isReset ? 'INTEGRATION_CREDENTIAL_RESET' : 'INTEGRATION_CREDENTIAL_CUSTOMIZED',
      targetType: 'system_settings',
      details: auditDetails
    });

    res.json({
      success: true,
      message: isReset
        ? `Reverted ${integration} credentials to default configuration.`
        : `Successfully verified and customized ${integration} credentials.`,
      data: await readSettings({ admin: true })
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Unable to update integration credentials.'
    });
  }
});

module.exports = router;
