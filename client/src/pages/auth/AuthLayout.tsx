import type { ReactNode } from 'react';
import { ArrowLeft, BriefcaseBusiness, ClipboardList, UserRound } from 'lucide-react';
import campus from '../../assets/branding/cot building.jpg';
import logo from '../../assets/branding/logo ccot.jpg';

type AuthLayoutProps = {
  title: string;
  subtitle: string;
  children: ReactNode;
  onBack?: () => void;
};

const features = [
  { label: 'Profile Management', icon: UserRound },
  { label: 'Academic Records', icon: ClipboardList },
  { label: 'Enrollment Tracking', icon: BriefcaseBusiness },
];

export function AuthLayout({ title, subtitle, children, onBack }: AuthLayoutProps) {
  return (
    <main
      className="relative flex min-h-screen items-center justify-center overflow-hidden bg-brand-900 bg-cover bg-center px-4 py-8 sm:px-8"
      style={{ backgroundImage: `url("${campus}")` }}
    >
      <div className="absolute inset-0 bg-gradient-to-r from-brand-950/90 via-brand-900/75 to-brand-900/65" />

      <div className="relative z-10 grid w-full max-w-6xl items-center gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14">
        <section className="mx-auto flex w-full max-w-xl flex-col justify-center text-white">
          <div className="flex items-center gap-4">
            <img
              src={logo}
              alt="Bukidnon State University College of Technologies"
              className="h-14 w-14 rounded-full bg-white object-contain p-1 shadow-md"
            />
            <div>
              <p className="text-sm font-bold tracking-wide sm:text-base">College of Technologies</p>
              <p className="mt-0.5 text-xs text-blue-100">Skills Today. Solutions Tomorrow.</p>
            </div>
          </div>

          <div className="mt-8 max-w-lg sm:mt-12">
            <h2 className="text-2xl font-bold leading-tight tracking-tight sm:text-3xl">
              Student Academic Profiling and Enrollment System
            </h2>
            <p className="mt-3 max-w-md text-sm leading-6 text-blue-50/90 sm:text-base">
              A unified platform for student information, academic records, and enrollment management.
            </p>
          </div>

          <div className="mt-7 grid max-w-lg grid-cols-3 gap-2 border-t border-white/20 pt-5 sm:mt-10 sm:gap-4">
            {features.map(({ label, icon: Icon }) => (
              <div key={label} className="flex flex-col items-center gap-2 text-center text-xs text-white sm:text-sm">
                <Icon aria-hidden="true" className="h-5 w-5 sm:h-6 sm:w-6" />
                <span>{label}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto w-full max-w-md rounded-lg bg-white px-6 py-7 shadow-2xl sm:px-8 sm:py-8">
          <div className="mb-5">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
            <p className="mt-1.5 text-sm text-slate-500">{subtitle}</p>
          </div>

          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-brand-600 transition-colors hover:text-brand-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
            >
              <ArrowLeft aria-hidden="true" className="h-4 w-4" />
              Back
            </button>
          )}

          {children}

          <p className="mt-6 text-center text-[11px] text-slate-500">
            © 2025 College of Technologies. All rights reserved.
          </p>
        </section>
      </div>
    </main>
  );
}
