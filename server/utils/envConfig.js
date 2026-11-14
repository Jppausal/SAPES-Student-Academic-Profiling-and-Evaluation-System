const fs = require('node:fs');
const path = require('node:path');

const ENV_PATH = path.resolve(__dirname, '../.env');

/**
 * Safely updates or appends a key-value pair in server/.env and synchronizes process.env.
 * @param {string} key
 * @param {string} value
 */
function updateEnvVariable(key, value) {
  if (!key || typeof key !== 'string') return;
  const valStr = value !== undefined && value !== null ? String(value) : '';

  // Synchronize process.env immediately
  process.env[key] = valStr;
  if (key === 'CUSTOM_CLIENT_ID') {
    process.env.CUSTOM_CIENT_ID = valStr;
  }

  try {
    let content = '';
    if (fs.existsSync(ENV_PATH)) {
      content = fs.readFileSync(ENV_PATH, 'utf8');
    }

    const lines = content.split(/\r?\n/);
    const keyRegex = new RegExp(`^#?\\s*${key}=.*$`);
    let found = false;

    for (let i = 0; i < lines.length; i++) {
      if (keyRegex.test(lines[i])) {
        lines[i] = `${key}=${valStr}`;
        found = true;
        break;
      }
    }

    if (!found) {
      if (lines.length > 0 && lines[lines.length - 1].trim() !== '') {
        lines.push('');
      }
      lines.push(`${key}=${valStr}`);
    }

    // Also keep CUSTOM_CIENT_ID in sync if key is CUSTOM_CLIENT_ID
    if (key === 'CUSTOM_CLIENT_ID') {
      const aliasRegex = /^#?\s*CUSTOM_CIENT_ID=.*$/;
      let aliasFound = false;
      for (let i = 0; i < lines.length; i++) {
        if (aliasRegex.test(lines[i])) {
          lines[i] = `CUSTOM_CIENT_ID=${valStr}`;
          aliasFound = true;
          break;
        }
      }
      if (!aliasFound) {
        lines.push(`CUSTOM_CIENT_ID=${valStr}`);
      }
    }

    const newContent = lines.join('\n');
    fs.writeFileSync(ENV_PATH, newContent, 'utf8');
  } catch (error) {
    console.warn(`Failed to update ${key} in ${ENV_PATH}:`, error.message);
  }
}

/**
 * Resets a key in server/.env to blank and clears it from process.env.
 * @param {string} key
 */
function removeEnvVariable(key) {
  updateEnvVariable(key, '');
  delete process.env[key];
  if (key === 'CUSTOM_CLIENT_ID') {
    delete process.env.CUSTOM_CIENT_ID;
  }
}

module.exports = {
  updateEnvVariable,
  removeEnvVariable,
  ENV_PATH
};
