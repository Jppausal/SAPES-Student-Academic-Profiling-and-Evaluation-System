const crypto = require('node:crypto');

const getEncryptionKey = () => {
  const secret = process.env.JWT_SECRET?.trim();
  if (!secret) throw new Error('JWT_SECRET is required to protect system settings');
  return crypto.createHash('sha256').update(`sapes-system-settings:${secret}`).digest();
};

const encryptSetting = (value) => {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', getEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv, authTag, encrypted].map(part => part.toString('base64url')).join('.');
};

const decryptSetting = (value) => {
  const [ivValue, authTagValue, encryptedValue] = String(value || '').split('.');
  if (!ivValue || !authTagValue || !encryptedValue) throw new Error('Invalid protected setting');
  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    getEncryptionKey(),
    Buffer.from(ivValue, 'base64url')
  );
  decipher.setAuthTag(Buffer.from(authTagValue, 'base64url'));
  return Buffer.concat([
    decipher.update(Buffer.from(encryptedValue, 'base64url')),
    decipher.final()
  ]).toString('utf8');
};

module.exports = { encryptSetting, decryptSetting };
