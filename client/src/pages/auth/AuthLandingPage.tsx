import { useEffect, useRef } from 'react';
import {
  ArrowRight,
  ClipboardCheck,
  FileText,
  HelpCircle,
  LockKeyhole,
  Megaphone,
  Phone,
  ShieldCheck,
  UserRound,
  UsersRound,
} from 'lucide-react';
import logo from '../../assets/branding/logo ccot.jpg';
import schoolPhoto from '../../assets/branding/cot building.jpg';
import lowerPagePhoto from '../../assets/branding/landingpage.jpg';

type AuthLandingPageProps = {
  onLogin: () => void;
};

export function AuthLandingPage({ onLogin }: AuthLandingPageProps) {
  const heroRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const hero = heroRef.current;
    if (!hero || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let frame = 0;
    const updateFade = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const fadeStart = hero.offsetHeight;
        const fadeDistance = hero.offsetHeight * 0.45;
        const fadeProgress = Math.min(1, Math.max(0, (window.scrollY - fadeStart) / fadeDistance));
        hero.style.setProperty('--landing-fade', String(1 - fadeProgress));
      });
    };

    updateFade();
    window.addEventListener('scroll', updateFade, { passive: true });
    window.addEventListener('resize', updateFade);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', updateFade);
      window.removeEventListener('resize', updateFade);
    };
  }, []);

  return (
    <div id="top" className="min-h-screen bg-brand-900 text-white">
      <header className="absolute inset-x-0 top-0 z-20 border-b border-white/15 bg-brand-900/40 text-white backdrop-blur-sm">
        <div className="mx-auto flex h-[76px] max-w-7xl items-center justify-between px-5 sm:px-8 lg:px-10">
          <a href="#top" className="flex items-center gap-3">
            <img src={logo} alt="College of Technologies logo" className="h-12 w-12 rounded-full bg-white object-contain p-0.5" />
            <span className="border-l border-white/25 pl-3 leading-tight text-white">
              <span className="block text-sm font-bold sm:text-base">College of Technologies</span>
              <span className="mt-0.5 block max-w-64 text-[9px] font-medium tracking-normal text-blue-100 sm:text-[10px]">
                Skills Today. Solutions Tomorrow.
              </span>
            </span>
          </a>

          <nav className="hidden items-center gap-8 text-[11px] font-semibold uppercase tracking-wide text-blue-50 lg:flex">
            <a href="#top" className="border-b-2 border-white py-7 text-white">Home</a>
            <a href="#about" className="transition-colors hover:text-white">About</a>
            <a href="#enrollment" className="transition-colors hover:text-white">Enrollment</a>
            <a href="#contact" className="transition-colors hover:text-white">Contact</a>
          </nav>

          <button
            type="button"
            onClick={onLogin}
            className="flex items-center gap-2 rounded-md bg-white px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-brand-700 shadow-sm transition-colors hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <UserRound className="h-4 w-4" />
            Login
          </button>
        </div>
      </header>

      <main>
        <section
          ref={heroRef}
          className="relative isolate flex min-h-screen min-h-[100svh] items-center overflow-hidden bg-brand-900 px-5 pb-16 pt-28 sm:px-8 sm:pt-32 lg:px-10"
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            style={{ opacity: 'var(--landing-fade, 1)' }}
          >
            <img src={schoolPhoto} alt="" className="h-full w-full object-cover object-center" />
            <div className="absolute inset-0 bg-gradient-to-r from-brand-950/90 via-brand-900/65 to-brand-900/35" />
            <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-brand-900" />
          </div>

          <div
            className="relative z-10 mx-auto w-full max-w-7xl"
            style={{ opacity: 'var(--landing-fade, 1)' }}
          >
            <div className="max-w-[530px] text-white">
              <p className="text-sm font-semibold text-blue-100">Bukidnon State University</p>
              <h1 className="mt-3 text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
                Student Academic Profiling and Enrollment System
              </h1>
              <p className="mt-5 max-w-[440px] text-sm leading-6 text-blue-50 sm:text-base">
                A unified platform for student information, academic records, and enrollment management.
              </p>
              <button
                type="button"
                onClick={onLogin}
                className="mt-7 flex items-center gap-3 rounded-md bg-white px-5 py-3 text-xs font-bold uppercase tracking-wide text-brand-700 transition-colors hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                Login to System
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </section>

        <div className="relative isolate overflow-hidden">
          <div aria-hidden="true" className="pointer-events-none absolute inset-0">
            <img src={lowerPagePhoto} alt="" className="h-full w-full object-cover object-center" />
            <div className="absolute inset-0 bg-gradient-to-b from-brand-900 via-brand-900/55 to-brand-950/75" />
          </div>

          <section id="about" className="px-5 py-14 sm:px-8 lg:px-10">
            <div className="relative z-10 mx-auto max-w-7xl">
              <div className="mb-9 text-center">
                <h2 className="text-2xl font-bold text-white">What You Can Do</h2>
                <div className="mx-auto mt-3 h-0.5 w-9 bg-brand-300" />
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  { icon: UserRound, title: 'Create Profile', text: 'Register and create your student profile securely online.' },
                  { icon: FileText, title: 'Submit Requirements', text: 'Upload and manage all required documents in one place.' },
                  { icon: ClipboardCheck, title: 'Track Application', text: 'Monitor the status of your enrollment application in real-time.' },
                  { icon: LockKeyhole, title: 'Secure & Reliable', text: 'Your data is protected with our secure and reliable system.' },
                ].map(({ icon: Icon, title, text }) => (
                  <article key={title} className="rounded-2xl border border-white/25 bg-brand-700/35 px-5 py-6 text-center shadow-lg shadow-brand-950/10 backdrop-blur-2xl backdrop-saturate-150">
                    <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-white/15 text-white">
                      <Icon className="h-10 w-10" strokeWidth={1.7} />
                    </div>
                    <h3 className="mt-5 text-sm font-bold text-white">{title}</h3>
                    <p className="mt-2 text-xs leading-5 text-blue-100">{text}</p>
                  </article>
                ))}
              </div>
            </div>
          </section>

          <section id="enrollment" className="px-5 py-12 sm:px-8 lg:px-10">
            <div className="relative z-10 mx-auto grid max-w-7xl gap-5 md:grid-cols-2">
              <div className="rounded-2xl border border-white/25 bg-brand-700/35 p-6 backdrop-blur-2xl backdrop-saturate-150 sm:p-8">
                <UsersRound className="h-8 w-8 text-brand-200" />
                <h2 className="mt-4 text-xl font-bold text-white">For Students</h2>
                <div className="mt-3 h-0.5 w-9 bg-brand-300" />
                <p className="mt-4 max-w-sm text-sm leading-6 text-blue-100">Access your academic records and manage your enrollment information using your institutional account.</p>
                <button type="button" onClick={onLogin} className="mt-5 flex items-center gap-3 rounded-md bg-white px-5 py-3 text-xs font-bold uppercase tracking-wide text-brand-700 transition-colors hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">
                  Student Login <ArrowRight className="h-4 w-4" />
                </button>
              </div>
              <div className="rounded-2xl border border-white/25 bg-brand-700/35 p-6 backdrop-blur-2xl backdrop-saturate-150 sm:p-8">
                <ShieldCheck className="h-8 w-8 text-brand-200" />
                <h2 className="mt-4 text-xl font-bold text-white">For School Staff</h2>
                <div className="mt-3 h-0.5 w-9 bg-brand-300" />
                <p className="mt-4 max-w-sm text-sm leading-6 text-blue-100">Access the admin portal to manage applications, students, and reports.</p>
                <button type="button" onClick={onLogin} className="mt-5 flex items-center gap-3 rounded-md border border-white/50 px-5 py-3 text-xs font-bold uppercase tracking-wide text-white transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">
                  Staff Login <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </section>

          <footer id="contact" className="relative z-10 border-t border-white/15 bg-brand-800/70 px-5 py-10 text-white backdrop-blur-xl sm:px-8 lg:px-10">
            <div className="mx-auto grid max-w-7xl gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { icon: ShieldCheck, title: 'Our Mission', text: 'To deliver an efficient, transparent, and student-centered enrollment experience.' },
                { icon: Megaphone, title: 'Announcements', text: 'Stay updated with the latest enrollment schedules and important reminders.' },
                { icon: HelpCircle, title: 'Need Help?', text: 'Check our FAQs or contact our support team.' },
                { icon: Phone, title: 'Contact Us', text: '(02) 8123 4567\nenrollment@bsu.edu.ph\nMalaybalay City, Philippines' },
              ].map(({ icon: Icon, title, text }) => (
                <div key={title} className="border-l border-white/15 pl-4">
                  <div className="flex items-center gap-3 text-sm font-semibold"><Icon className="h-6 w-6 text-brand-300" />{title}</div>
                  <p className="mt-4 whitespace-pre-line text-xs leading-5 text-brand-100">{text}</p>
                </div>
              ))}
            </div>
            <div className="mx-auto mt-9 flex max-w-7xl flex-col justify-between gap-2 border-t border-white/15 pt-4 text-[11px] text-brand-100 sm:flex-row">
              <span>© 2026 Bukidnon State University. All rights reserved.</span>
              <span>Privacy Policy &nbsp; | &nbsp; Terms of Use</span>
            </div>
          </footer>
        </div>
      </main>
    </div>
  );
}
