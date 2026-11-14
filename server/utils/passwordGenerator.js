const crypto = require('crypto');
const { readSettings, getEffectiveApiNinjasKey } = require('./systemSettings');

function generateSecureLocalPassword(length = 12) {
  const uppercase = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lowercase = 'abcdefghijkmnpqrstuvwxyz';
  const digits = '23456789';
  const specials = '!@#$%&*';
  const all = uppercase + lowercase + digits + specials;

  const chars = [
    uppercase[crypto.randomInt(uppercase.length)],
    lowercase[crypto.randomInt(lowercase.length)],
    digits[crypto.randomInt(digits.length)],
    specials[crypto.randomInt(specials.length)]
  ];

  for (let i = chars.length; i < length; i++) {
    chars.push(all[crypto.randomInt(all.length)]);
  }

  // Fisher-Yates shuffle
  for (let i = chars.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }

  return chars.join('');
}

async function generatePassword(options = {}) {
  const length = Math.max(8, Math.min(32, Number(options.length) || 12));
  const settings = await readSettings();
  const isEnabled = settings.integrations?.passwordGenerator?.enabled !== false;

  if (!isEnabled) {
    const error = new Error('Password generator is disabled in App Settings.');
    error.status = 403;
    throw error;
  }

  const apiKey = getEffectiveApiNinjasKey().trim();
  if (!apiKey) {
    return {
      password: generateSecureLocalPassword(length),
      source: 'fallback',
      message: 'API_NINJAS_API_KEY is not configured in server/.env; generated via secure local generator.'
    };
  }

  try {
    const url = `https://api.api-ninjas.com/v1/passwordgenerator?length=${length}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-Api-Key': apiKey,
        'Accept': 'application/json'
      },
      signal: AbortSignal.timeout(5000)
    });

    if (!response.ok) {
      console.warn(`API Ninjas password generator responded with status ${response.status}`);
      return {
        password: generateSecureLocalPassword(length),
        source: 'fallback',
        message: `API Ninjas returned HTTP ${response.status}; fell back to secure local generator.`
      };
    }

    const data = await response.json();
    if (data && typeof data.random_password === 'string' && data.random_password.length >= 8) {
      return {
        password: data.random_password,
        source: 'api-ninjas',
        message: 'Password successfully generated via API Ninjas Password Generator.'
      };
    }

    return {
      password: generateSecureLocalPassword(length),
      source: 'fallback',
      message: 'Unexpected response from API Ninjas; fell back to secure local generator.'
    };
  } catch (error) {
    console.warn('API Ninjas request failed:', error.message);
    return {
      password: generateSecureLocalPassword(length),
      source: 'fallback',
      message: 'Network error communicating with API Ninjas; fell back to secure local generator.'
    };
  }
}

module.exports = {
  generatePassword,
  generateSecureLocalPassword
};
