import { useEffect, useState } from 'react';
import { fetchIntegrationSettings } from '../lib/api';

export function useEmailAvailability() {
  const [state, setState] = useState({ enabled: false, message: 'Checking email service…' });
  useEffect(() => {
    let active = true;
    fetchIntegrationSettings().then(settings => {
      const enabled = settings.integrations.smtp.enabled && settings.integrations.smtp.configured;
      if (active) setState({ enabled, message: enabled ? '' : 'Email service is currently unavailable. Email-based password changes cannot be requested.' });
    }).catch(() => { if (active) setState({ enabled: false, message: 'Unable to check email service. Reload to try again.' }); });
    return () => { active = false; };
  }, []);
  return state;
}
