import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle } from 'lucide-react';
import { RATE_LIMITED_EVENT } from '../../lib/api';

const LOCKOUT_SECONDS = 15;

export function RateLimitNotice() {
  const [retryAt, setRetryAt] = useState<number | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);

  useEffect(() => {
    const handleRateLimit = () => {
      setRetryAt(Date.now() + LOCKOUT_SECONDS * 1000);
    };

    window.addEventListener(RATE_LIMITED_EVENT, handleRateLimit);
    return () => window.removeEventListener(RATE_LIMITED_EVENT, handleRateLimit);
  }, []);

  useEffect(() => {
    if (retryAt === null) return undefined;

    const appRoot = document.getElementById('root');
    if (!appRoot) return undefined;

    const wasInert = appRoot.inert;
    appRoot.inert = true;
    return () => {
      appRoot.inert = wasInert;
    };
  }, [retryAt]);

  useEffect(() => {
    if (retryAt === null) return undefined;

    const updateCountdown = () => {
      const remaining = Math.max(0, Math.ceil((retryAt - Date.now()) / 1000));
      setSecondsLeft(remaining);
      if (remaining === 0) setRetryAt(null);
    };

    updateCountdown();
    const intervalId = window.setInterval(updateCountdown, 1000);
    return () => window.clearInterval(intervalId);
  }, [retryAt]);

  if (retryAt === null) return null;

  return createPortal(
    <>
      <div
        className="fixed inset-0 z-[10000] cursor-wait bg-transparent"
        aria-hidden="true"
      />
      <aside
        className="fixed bottom-4 right-4 z-[10001] w-[calc(100vw-2rem)] max-w-sm rounded-xl border border-amber-300 bg-white p-4 shadow-2xl shadow-slate-950/20"
        role="alert"
        aria-live="assertive"
      >
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-800">
            <AlertTriangle className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-slate-950">Too many requests</p>
            <p className="mt-1 text-sm leading-5 text-slate-700">
              Please wait {secondsLeft} seconds before trying again.
            </p>
          </div>
        </div>
      </aside>
    </>,
    document.body
  );
}
