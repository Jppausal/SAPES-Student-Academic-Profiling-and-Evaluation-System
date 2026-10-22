const router = require('express').Router();
const SystemSettings = require('../models/SystemSettings');
const AuditLog = require('../models/AuditLog');
const authenticate = require('../middleware/authMiddleware');
const roles = require('../middleware/roleMiddleware');
const { authorizePermission } = require('../middleware/permissionMiddleware');
const { readSettings, configuration } = require('../utils/systemSettings');
router.use((_req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });

// Public projection contains only feature flags and configuration booleans.
router.get('/public', async (_req, res) => {
  try { res.json({ success: true, data: await readSettings() }); }
  catch { res.status(503).json({ success: false, message: 'Integration settings are unavailable.' }); }
});
router.use(authenticate, roles('admin'), authorizePermission('manage_users'));
router.get('/', async (_req, res) => {
  try { res.json({ success: true, data: await readSettings() }); }
  catch { res.status(503).json({ success: false, message: 'Unable to load settings.' }); }
});
router.put('/', async (req, res) => {
  try {
    const body = req.body;
    const integrations = body?.integrations;
    if (!body || Object.keys(body).some(key => key !== 'integrations') || !integrations
      || typeof integrations !== 'object' || Array.isArray(integrations) || !Object.keys(integrations).length) {
      return res.status(400).json({ success: false, message: 'Provide integration settings only.' });
    }
    const configured = configuration();
    const updates = {};
    for (const [name, value] of Object.entries(integrations)) {
      if (!Object.hasOwn(configured, name) || !value || typeof value !== 'object'
        || Object.keys(value).length !== 1 || typeof value.enabled !== 'boolean') {
        return res.status(400).json({ success: false, message: 'Unsupported setting or invalid enabled value.' });
      }
      if (value.enabled && !configured[name]) return res.status(400).json({ success: false, message: `${name} is not configured or unavailable.` });
      updates[`integrations.${name}.enabled`] = value.enabled;
    }
    // Atomic update returns the actual previous state, including concurrent changes.
    const before = await SystemSettings.findOneAndUpdate({ _id: 'system' },
      { $set: { ...updates, updatedBy: req.user.userId } }, { upsert: true, new: false, runValidators: true });
    const changes = Object.entries(integrations).map(([name, value]) => ({
      setting: name, oldEnabled: before?.integrations?.[name]?.enabled ?? (name !== 'recaptcha'), newEnabled: value.enabled
    })).filter(change => change.oldEnabled !== change.newEnabled);
    await AuditLog.create({ userId: req.user.userId, userRole: 'admin', userModel: 'AdminUser', action: 'SYSTEM_SETTINGS_UPDATED', targetType: 'system_settings', details: { changes } });
    res.json({ success: true, data: await readSettings() });
  } catch { res.status(500).json({ success: false, message: 'Unable to save settings. Reload to check current values.' }); }
});
module.exports = router;
