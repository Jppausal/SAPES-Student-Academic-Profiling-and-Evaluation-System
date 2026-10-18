import type { ReactNode } from 'react';
import { ArrowLeft } from 'lucide-react';
import logo from '../../assets/branding/logo ccot.jpg';

type AuthLayoutProps = {
  title: string;
  subtitle: string;
  children: ReactNode;
  onBack?: () => void;
};

export function AuthLayout({ title, subtitle, children, onBack }: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 md:p-8">
      <div className="w-full max-w-6xl overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-slate-200">
        <div className="grid md:grid-cols-2">
          <div className="hidden md:flex flex-col justify-between gap-10 bg-brand-700 p-10">
            <div className="flex items-center gap-3">
              <img src={logo} alt="College of Technologies logo" className="h-12 w-12 rounded-full bg-white object-contain p-0.5" />
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.2em] text-white">SAPES</p>
                <p className="mt-1 text-[11px] leading-tight text-brand-200">
                  Student Enrollment & Academic Status Management System
                </p>
              </div>
            </div>

            <div className="max-w-md">
              <h2 className="text-3xl font-bold leading-tight text-white">Academic success starts here.</h2>
              <p className="mt-3 text-sm leading-6 text-brand-100">
                Manage records, evaluate progress, and stay connected with your academic journey in one secure platform.
              </p>
            </div>

            <div className="border-t border-white/15 pt-5">
              <p className="text-sm font-semibold text-white">Bukidnon State University</p>
              <p className="mt-0.5 text-xs text-brand-200">Malaybalay City, Philippines</p>
            </div>
          </div>

          <div className="flex items-center justify-center bg-white p-6 sm:p-10">
            <div className="w-full max-w-md">
              <div className="mb-7 flex items-center gap-3 md:hidden">
                <img src={logo} alt="College of Technologies logo" className="h-12 w-12 rounded-full object-contain" />
                <div className="leading-tight">
                  <p className="text-sm font-extrabold tracking-[0.08em] text-brand-700">SAPES</p>
                  <p className="mt-1 text-[11px] text-slate-500">Student Enrollment & Academic Status Management System</p>
                </div>
              </div>
              {onBack && (
                <button
                  type="button"
                  onClick={onBack}
                  className="mb-6 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 hover:text-brand-600 transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </button>
              )}

              <div className="mb-6">
                <h1 className="text-3xl font-bold text-slate-900">{title}</h1>
                <p className="mt-2 text-sm text-slate-600">{subtitle}</p>
              </div>

              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
