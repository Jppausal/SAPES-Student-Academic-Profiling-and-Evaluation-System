import React, { useState } from 'react';
import { confirmPasswordReset, requestPasswordReset } from '../../lib/api';

export const ForgotPasswordPage: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [username, setUsername] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [sent, setSent] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setError('');
    try {
      const result = sent ? await confirmPasswordReset(username, code, password) : await requestPasswordReset(username);
      setMessage(result.message); setSent(true);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to process password reset'); }
  };
  return <main className="mx-auto flex min-h-screen max-w-md items-center p-5"><section className="w-full rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><h1 className="text-xl font-bold">Reset your password</h1><p className="mt-2 text-sm text-slate-600">A verification code will be sent to your institutional email.</p>{message && <p className="mt-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{message}</p>}{error && <p className="mt-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}<form onSubmit={submit} className="mt-5 space-y-3"><input required value={username} onChange={(event) => setUsername(event.target.value)} placeholder="Username or institution ID" className="w-full rounded-lg border p-3" />{sent && <><input required value={code} onChange={(event) => setCode(event.target.value)} inputMode="numeric" maxLength={6} placeholder="6-digit code" className="w-full rounded-lg border p-3" /><input required value={password} onChange={(event) => setPassword(event.target.value)} type="password" minLength={8} placeholder="New password (8+ characters)" className="w-full rounded-lg border p-3" /></>}<button className="w-full rounded-lg bg-indigo-600 p-3 font-semibold text-white">{sent ? 'Set new password' : 'Send verification code'}</button></form><button onClick={onBack} className="mt-4 text-sm text-indigo-600">Back to login</button></section></main>;
};
