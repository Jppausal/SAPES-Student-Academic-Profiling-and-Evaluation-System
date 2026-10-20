import { useEmailAvailability } from '../../hooks/useEmailAvailability';
import React, { useState } from 'react';
import { confirmPasswordReset, requestPasswordReset, verifyPasswordReset } from '../../lib/api';
import { AuthLayout } from './AuthLayout';

const inputClass = 'w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-100';
const labelClass = 'mb-2 block text-sm font-medium text-slate-700';
const alertClass = 'rounded-xl border px-3 py-2 text-sm';

export const ForgotPasswordPage: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const emailAvailability = useEmailAvailability();
  const [username, setUsername] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [sent, setSent] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    try {
      if (sent) {
        const verify = await verifyPasswordReset(username, code);
        const result = await confirmPasswordReset(verify.resetAuthorization, password);
        setMessage(result.message);
      } else {
        const result = await requestPasswordReset(username);
        setMessage(result.message);
        setSent(true);
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to process password reset');
    }
  };

  return (
    <AuthLayout
      title="Reset your password"
      subtitle="A verification code will be sent to your institutional email."
      onBack={onBack}
    >
      <p role="status" className="text-sm text-slate-600">{emailAvailability.message}</p>
      <form className="space-y-5" onSubmit={submit}>
        <div>
          <label htmlFor="reset-username" className={labelClass}>Username or institution ID</label>
          <input
            id="reset-username"
            required
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            placeholder="Enter your username or institution ID"
            className={inputClass}
          />
        </div>

        {sent && (
          <>
            <div>
              <label htmlFor="reset-code" className={labelClass}>Verification code</label>
              <input
                id="reset-code"
                required
                value={code}
                onChange={(event) => setCode(event.target.value)}
                inputMode="numeric"
                maxLength={6}
                autoComplete="one-time-code"
                placeholder="6-digit code"
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="reset-password" className={labelClass}>New password</label>
              <input
                id="reset-password"
                required
                type="password"
                minLength={8}
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="At least 8 characters"
                className={inputClass}
              />
            </div>
          </>
        )}

        {message && <p role="status" className={`${alertClass} border-emerald-200 bg-emerald-50 text-emerald-800`}>{message}</p>}
        {error && <p role="alert" className={`${alertClass} border-rose-200 bg-rose-50 text-rose-700`}>{error}</p>}

        <button
          disabled={!emailAvailability.enabled}
          type="submit"
          className="w-full rounded-xl bg-accent-500 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-accent-700 focus:outline-none focus:ring-4 focus:ring-accent-200"
        >
          {sent ? 'Set new password' : 'Send verification code'}
        </button>
      </form>
    </AuthLayout>
  );
};
