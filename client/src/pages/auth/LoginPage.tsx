import React from 'react';
import { AuthLayout } from './AuthLayout';

type LoginPageProps = {
  onLogin: (username: string, password: string) => Promise<{ success: boolean; message?: string }>;
  onGoogleLogin: (credential: string) => Promise<{ success: boolean; message?: string }>;
};

export default function LoginPage({ onLogin, onGoogleLogin }: LoginPageProps) {
  const [error, setError] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const googleButtonRef = React.useRef<HTMLDivElement>(null);
  const [googleLoading, setGoogleLoading] = React.useState(true);
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim();
  const googleClientIdPresent = Boolean(googleClientId);

  React.useEffect(() => {
    const clientId = googleClientId;
    console.info('[SAPES] Google client ID present:', Boolean(clientId));
    console.info('[SAPES] Google sign-in origin:', window.location.origin);
    if (!clientId) {
      setGoogleLoading(false);
      return;
    }

    const renderGoogleButton = () => {
      if (!window.google || !googleButtonRef.current) return;
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: async (response) => {
          setError('');
          setIsSubmitting(true);
          const result = await onGoogleLogin(response.credential);
          setIsSubmitting(false);
          if (!result.success) setError(result.message || 'Unable to sign in with Google.');
        },
        hd: '*',
        auto_select: false,
      });
      googleButtonRef.current.replaceChildren();
      window.google.accounts.id.renderButton(googleButtonRef.current, {
        type: 'standard',
        theme: 'outline',
        size: 'large',
        text: 'continue_with',
        shape: 'rectangular',
        width: '400',
      });
      setGoogleLoading(false);
    };

    if (window.google) {
      renderGoogleButton();
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = renderGoogleButton;
    script.onerror = () => setGoogleLoading(false);
    document.head.appendChild(script);
    return () => {
      script.onload = null;
    };
  }, [googleClientId, onGoogleLogin]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);
    const form = new FormData(event.currentTarget);
    const result = await onLogin(
      String(form.get('username') || ''),
      String(form.get('password') || '')
    );
    setIsSubmitting(false);
    if (!result.success) {
      setError(result.message || 'Unable to sign in.');
    }
  };

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to continue managing your academic records and student information."
      footerText="Don’t have an account?"
      footerLinkText="Create one"
      footerLinkHref="/signup"
    >
      <form className="space-y-5" onSubmit={handleSubmit}>
        <div>
          <label htmlFor="username" className="mb-2 block text-sm font-medium text-slate-700">
          Username
          </label>
          <input
          id="username"
          name="username"
          type="text"
          autoComplete="username"
          placeholder="admin.test"
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-100"
          />
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <label htmlFor="password" className="text-sm font-medium text-slate-700">
              Password
            </label>
            <a href="/forgot-password" className="text-xs font-medium text-indigo-600 hover:text-indigo-500">
              Forgot password?
            </a>
          </div>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            placeholder="Enter your password"
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-100"
          />
        </div>

        {error && (
          <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {error}
          </p>
        )}

        <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
          <label htmlFor="remember" className="flex items-center gap-2 text-sm text-slate-600">
            <input id="remember" type="checkbox" className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
            Remember me
          </label>
          <span className="text-xs font-medium uppercase tracking-wide text-slate-400">Secure login</span>
        </div>

        <button
          type="submit"
          className="w-full rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-200"
        >
          {isSubmitting ? 'Signing in…' : 'Login'}
        </button>

        <div className="flex items-center gap-3 text-xs text-slate-400">
          <span className="h-px flex-1 bg-slate-200" />
          <span>OR</span>
          <span className="h-px flex-1 bg-slate-200" />
        </div>

        <div className="flex min-h-10 justify-center">
          {googleClientIdPresent ? (
            <div ref={googleButtonRef} aria-label="Continue with Google" />
          ) : (
            <p className="text-center text-xs text-slate-400">
              Google sign-in is not configured for {window.location.origin}.
            </p>
          )}
        </div>
        {googleLoading && googleClientIdPresent && (
          <p className="text-center text-xs text-slate-400">Loading Google sign-in…</p>
        )}
      </form>
    </AuthLayout>
  );
}
