import type { ReactNode } from 'react';
import { ArrowLeft } from 'lucide-react';
import logo from '../../assets/branding/coloredlogo.png';
import plainLogo from '../../assets/branding/logo.png';

type AuthLayoutProps = {
  title: string;
  subtitle: string;
  children: ReactNode;
  footerText?: string;
  footerLinkText?: string;
  footerLinkHref?: string;
  onBack?: () => void;
};

export function AuthLayout({
  title,
  subtitle,
  children,
  footerText,
  footerLinkText,
  footerLinkHref,
  onBack,
}: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 md:p-8">
      <div className="w-full max-w-6xl overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-slate-200">
        <div className="grid md:grid-cols-2">
          <div className="hidden md:flex items-center justify-center bg-gradient-to-br from-indigo-600 via-violet-600 to-sky-600 p-10">
            <div className="w-full max-w-md space-y-6 text-white">
              <div className="inline-flex items-center gap-3">
                <img src={logo} alt="Bukidnon State University logo" className="h-10 w-10 object-contain" />
                <span className="text-sm font-semibold tracking-[0.2em] uppercase">SAPES</span>
              </div>

              <img src={plainLogo} alt="Bukidnon State University logo" className="h-64 w-full object-contain" />

              <div>
                <h2 className="text-2xl font-bold">Academic success starts here.</h2>
                <p className="mt-2 text-sm text-indigo-100">
                  Manage records, evaluate progress, and stay connected with your academic journey in one secure platform.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-center bg-white p-6 sm:p-10">
            <div className="w-full max-w-md">
              {onBack && (
                <button
                  type="button"
                  onClick={onBack}
                  className="mb-6 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 hover:text-indigo-600 transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </button>
              )}

              <img src={logo} alt="Bukidnon State University logo" className="h-12 w-auto mb-8" />

              <div className="mb-6">
                <h1 className="text-3xl font-bold text-slate-900">{title}</h1>
                <p className="mt-2 text-sm text-slate-600">{subtitle}</p>
              </div>

              {children}

              {footerText && footerLinkText && footerLinkHref && (
                <p className="mt-6 text-center text-sm text-slate-600">
                  {footerText}{' '}
                  <a href={footerLinkHref} className="font-semibold text-indigo-600 hover:text-indigo-500">
                    {footerLinkText}
                  </a>
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
