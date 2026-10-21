import { useCallback, useEffect, useState } from 'react';
import { fetchUserSettings, UserNotificationPreferences } from '../lib/api';

export interface StudentPortalPreferences {
  compactGrades: boolean;
  gwaPrivacyShield: boolean;
  dateFormat: string;
}

const STORAGE_KEYS = {
  COMPACT: 'sapes_pref_compact_grades',
  GWA_PRIVACY: 'sapes_pref_gwa_privacy',
  DATE_FORMAT: 'sapes_pref_date_format',
  NOTIFICATIONS: 'sapes_pref_notifications',
};

const PREFERENCES_EVENT = 'sapes:portal-preferences-changed';
const NOTIFICATIONS_EVENT = 'sapes:notifications-changed';

export function getStoredPreferences(): StudentPortalPreferences {
  try {
    return {
      compactGrades: localStorage.getItem(STORAGE_KEYS.COMPACT) === 'true',
      gwaPrivacyShield: localStorage.getItem(STORAGE_KEYS.GWA_PRIVACY) === 'true',
      dateFormat: localStorage.getItem(STORAGE_KEYS.DATE_FORMAT) || 'MM/DD/YYYY',
    };
  } catch {
    return {
      compactGrades: false,
      gwaPrivacyShield: false,
      dateFormat: 'MM/DD/YYYY',
    };
  }
}

export function saveStoredPreferences(next: Partial<StudentPortalPreferences>) {
  try {
    if (typeof next.compactGrades === 'boolean') {
      localStorage.setItem(STORAGE_KEYS.COMPACT, String(next.compactGrades));
    }
    if (typeof next.gwaPrivacyShield === 'boolean') {
      localStorage.setItem(STORAGE_KEYS.GWA_PRIVACY, String(next.gwaPrivacyShield));
    }
    if (typeof next.dateFormat === 'string') {
      localStorage.setItem(STORAGE_KEYS.DATE_FORMAT, next.dateFormat);
    }
    const current = getStoredPreferences();
    window.dispatchEvent(new CustomEvent(PREFERENCES_EVENT, { detail: current }));
  } catch {}
}

export function useStudentPreferences() {
  const [preferences, setPreferences] = useState<StudentPortalPreferences>(getStoredPreferences);

  useEffect(() => {
    const handleUpdate = () => {
      setPreferences(getStoredPreferences());
    };
    window.addEventListener(PREFERENCES_EVENT, handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener(PREFERENCES_EVENT, handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  const setCompactGrades = useCallback((val: boolean) => {
    saveStoredPreferences({ compactGrades: val });
  }, []);

  const setGwaPrivacyShield = useCallback((val: boolean) => {
    saveStoredPreferences({ gwaPrivacyShield: val });
  }, []);

  const setDateFormat = useCallback((fmt: string) => {
    saveStoredPreferences({ dateFormat: fmt });
  }, []);

  return {
    ...preferences,
    setCompactGrades,
    setGwaPrivacyShield,
    setDateFormat,
  };
}

export function getStoredNotificationPreferences(): UserNotificationPreferences {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        profileAndAcademicUpdates: parsed.profileAndAcademicUpdates ?? true,
        emailAlerts: parsed.emailAlerts ?? true,
        securityAlerts: parsed.securityAlerts ?? true,
      };
    }
  } catch {}
  return {
    profileAndAcademicUpdates: true,
    emailAlerts: true,
    securityAlerts: true,
  };
}

export function useStudentNotificationPreferences() {
  const [notifications, setNotifications] = useState<UserNotificationPreferences>(getStoredNotificationPreferences);

  useEffect(() => {
    let active = true;
    fetchUserSettings()
      .then((res) => {
        if (!active) return;
        const fresh: UserNotificationPreferences = {
          profileAndAcademicUpdates: res.notificationPreferences.profileAndAcademicUpdates ?? true,
          emailAlerts: res.notificationPreferences.emailAlerts ?? true,
          securityAlerts: res.notificationPreferences.securityAlerts ?? true,
        };
        setNotifications(fresh);
        try {
          localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(fresh));
        } catch {}
      })
      .catch(() => {});

    const handleUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<UserNotificationPreferences>;
      if (customEvent.detail) {
        setNotifications((prev) => {
          const updated = { ...prev, ...customEvent.detail };
          try {
            localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(updated));
          } catch {}
          return updated;
        });
      }
    };

    window.addEventListener(NOTIFICATIONS_EVENT, handleUpdate);
    return () => {
      active = false;
      window.removeEventListener(NOTIFICATIONS_EVENT, handleUpdate);
    };
  }, []);

  return notifications;
}

export function formatPortalDate(dateInput: string | Date | undefined | null, format = 'MM/DD/YYYY'): string {
  if (!dateInput) return '';
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (!d || Number.isNaN(d.getTime())) return typeof dateInput === 'string' ? dateInput : '';

  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const year = String(d.getFullYear());

  switch (format) {
    case 'YYYY-MM-DD':
      return `${year}-${month}-${day}`;
    case 'DD/MM/YYYY':
      return `${day}/${month}/${year}`;
    case 'MM/DD/YYYY':
    default:
      return `${month}/${day}/${year}`;
  }
}

