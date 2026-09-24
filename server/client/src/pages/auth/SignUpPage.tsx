import React from 'react';
import { AuthLayout } from './AuthLayout';

export default function SignUpPage() {
  return (
    <AuthLayout
      title="Sign‑up disabled"
      subtitle="User registration is managed by the university staff."
      footerText=""
      footerLinkText=""
      footerLinkHref="#"
    >
      <p className="mt-4 text-center text-sm text-slate-600">
        Account creation is restricted to administrators. Please contact the registrar for a new account.
      </p>
    </AuthLayout>
  );
}
