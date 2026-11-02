import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchIntegrationSettings } from '../lib/api';

type CaptchaApi = {
  render: (element: HTMLElement, options: Record<string, unknown>) => number;
  reset: (id: number) => void;
  ready: (callback: () => void) => void;
};

declare global {
  interface Window {
    grecaptcha?: CaptchaApi;
  }
}

let scriptPromise: Promise<CaptchaApi> | undefined;

function loadCaptcha(): Promise<CaptchaApi> {
  if (!scriptPromise) {
    scriptPromise = new Promise<CaptchaApi>((resolve, reject) => {
      const finish = () => window.grecaptcha?.ready(() => resolve(window.grecaptcha!));
      if (window.grecaptcha) {
        finish();
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://www.google.com/recaptcha/api.js?render=explicit';
      script.async = true;
      script.defer = true;
      script.onload = finish;
      script.onerror = () => {
        script.remove();
        scriptPromise = undefined;
        reject(new Error('Unable to load verification. Reload to retry.'));
      };
      document.head.appendChild(script);
    });
  }
  return scriptPromise;
}

export function useRecaptcha() {
  const [setting, setSetting] = useState<{ enabled: boolean; configured: boolean; siteKey?: string } | null>(null);
  const [token, setToken] = useState('');
  const [error, setError] = useState('');
  const [containerNode, setContainerNode] = useState<HTMLDivElement | null>(null);
  const widget = useRef<number | null>(null);

  const containerRef = useCallback((node: HTMLDivElement | null) => {
    setContainerNode(node);
  }, []);

  useEffect(() => {
    let active = true;
    fetchIntegrationSettings()
      .then((result) => {
        if (active) setSetting(result.integrations?.recaptcha || { enabled: false, configured: false });
      })
      .catch(() => {
        if (active) {
          setSetting({ enabled: false, configured: false });
        }
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!setting?.enabled || !setting.configured || !setting.siteKey || !containerNode) return;
    let active = true;
    loadCaptcha()
      .then((api) => {
        if (!active || !containerNode) return;
        const element = document.createElement('div');
        containerNode.replaceChildren(element);
        widget.current = api.render(element, {
          sitekey: setting.siteKey,
          size: 'normal',
          callback: (value: string) => {
            if (active) {
              setToken(value);
              setError('');
            }
          },
          'expired-callback': () => {
            if (active) setToken('');
          },
          'error-callback': () => {
            if (active) {
              setToken('');
              setError('Verification could not load. Reload to retry.');
            }
          }
        });
      })
      .catch((reason) => {
        if (active) setError(reason.message);
      });
    return () => {
      active = false;
      widget.current = null;
      if (containerNode) containerNode.replaceChildren();
    };
  }, [setting, containerNode]);

  const reset = () => {
    setToken('');
    if (widget.current !== null) {
      try {
        window.grecaptcha?.reset(widget.current);
      } catch {
        // ignore
      }
    }
  };

  const isEnabled = setting?.enabled === true;
  const ready = !setting ? false : !setting.enabled || Boolean(setting.configured && token);

  const view = isEnabled ? (
    <div className="flex flex-col items-center justify-center py-1.5 w-full">
      <div ref={containerRef} className="flex justify-center w-full min-h-[78px]" />
      {!setting.configured && (
        <p role="alert" className="mt-1.5 text-center text-xs text-rose-700">
          Sign-in verification is enabled but not configured. An administrator must add the reCAPTCHA site key, secret key, and allowed hostnames to server/.env, then restart the API.
        </p>
      )}
      {error && (
        <p role="alert" className="mt-1.5 text-center text-xs text-rose-700">
          {error}
        </p>
      )}
    </div>
  ) : error ? (
    <p role="alert" className="text-center text-xs text-rose-700">{error}</p>
  ) : null;

  return { token, reset, ready, view };
}
