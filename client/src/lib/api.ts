const apiBaseUrl = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

export type ServerStatus = 'checking' | 'online' | 'offline';

export async function checkServerHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${apiBaseUrl}/api/health`, {
      headers: { Accept: 'application/json' },
    });
    return response.ok;
  } catch {
    return false;
  }
}
