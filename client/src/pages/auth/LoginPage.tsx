import { fetchIntegrationSettings } from '../../lib/api';
import React from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { AuthLayout } from './AuthLayout';

type LoginPageProps = {
  onLogin: (username: string, password: string) => Promise<{ success: boolean; message?: string }>;
  onGoogleLogin: (credential: string) => Promise<{ success: boolean; message?: string }>;
  onBack?: () => void;
  onForgotPassword?: () => void;
};

export default function LoginPage({ onLogin, onGoogleLogin, onBack, onForgotPassword }: LoginPageProps) {
  const [error, setError] = React.useState('');
  const [loginIdentifier, setLoginIdentifier] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [showPassword, setShowPassword] = React.useState(false);
  const googleButtonRef = React.useRef<HTMLDivElement>(null);
  const [googleLoading, setGoogleLoading] = React.useState(true);
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim();
  const [googleEnabled, setGoogleEnabled] = React.useState(false);
  React.useEffect(() => { fetchIntegrationSettings().then(settings => setGoogleEnabled(settings.integrations.googleAuth.enabled && settings.integrations.googleAuth.configured)).catch(() => setGoogleEnabled(false)); }, []);
  const googleClientIdPresent = Boolean(googleClientId) && googleEnabled;
  const isInstitutionalEmail = ['@student.buksu.edu.ph', '@faculty.buksu.edu.ph']
    .some((domain) => loginIdentifier.trim().toLowerCase().endsWith(domain));
  const shouldWarnAboutEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(loginIdentifier.trim())
    && !isInstitutionalEmail;

  React.useEffect(() => {
    const clientId = googleEnabled ? googleClientId : undefined;
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
        width: String(Math.min(400, googleButtonRef.current.clientWidth)),
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
  }, [googleClientId, googleEnabled, onGoogleLogin]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);
    const form = new FormData(event.currentTarget);
    const loginIdentifier = String(form.get('username') || '').trim();
    const result = await onLogin(
      loginIdentifier,
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
      subtitle="Sign in to your account"
      onBack={onBack}
    >
      <form className="space-y-3.5" onSubmit={handleSubmit}>
        <div>
          <label htmlFor="username" className="mb-1.5 block text-xs font-medium text-slate-700">
            Username or Student ID
          </label>
          <div className="flex w-full overflow-hidden rounded-md border border-slate-300 bg-white transition focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-100">
            <input
              id="username"
              name="username"
              type="text"
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              placeholder="Enter your username or student ID"
              maxLength={64}
              onChange={(event) => {
                setLoginIdentifier(event.target.value);
                setError('');
              }}
              className="w-full bg-transparent px-3 py-2 text-sm text-slate-900 outline-none"
            />
          </div>
          {shouldWarnAboutEmail && (
            <p role="status" className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              Use your institutional account: @student.buksu.edu.ph for students or @faculty.buksu.edu.ph for faculty.
            </p>
          )}
        </div>

        <div>
          <label htmlFor="password" className="mb-1.5 block text-xs font-medium text-slate-700">
            Password
          </label>
          <div className="relative">
            <input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="Enter your password"
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 pr-12 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 flex items-center px-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="h-4 w-4 text-slate-500 hover:text-slate-700 transition-colors" /> : <Eye className="h-4 w-4 text-slate-500 hover:text-slate-700 transition-colors" />}
            </button>
          </div>
          <button type="button" onClick={onForgotPassword} className="mt-2 inline-block text-xs font-medium text-brand-600 hover:text-brand-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500">
            Forgot password?
          </button>
        </div>

        {error && (
          <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {error}
          </p>
        )}

        <button
          type="submit"
          className="w-full rounded-md bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 focus:outline-none focus:ring-4 focus:ring-brand-200"
        >
          {isSubmitting ? 'Signing in…' : 'Login'}
        </button>

        <div className="flex items-center gap-3 text-xs text-slate-500">
          <span className="h-px flex-1 bg-slate-200" />
          <span>Or continue with</span>
          <span className="h-px flex-1 bg-slate-200" />
        </div>

        <div className="flex min-h-10 w-full justify-center">
          {googleClientIdPresent ? (
            <div ref={googleButtonRef} aria-label="Continue with Google" className="w-full" />
          ) : (
            <p className="text-center text-xs text-slate-500">
              Google sign-in is currently unavailable. Use your institutional account to sign in.
            </p>
          )}
        </div>
        {googleLoading && googleClientIdPresent && (
          <p className="text-center text-xs text-slate-500">Loading Google sign-in…</p>
        )}
      </form>
    </AuthLayout>
  );
}
