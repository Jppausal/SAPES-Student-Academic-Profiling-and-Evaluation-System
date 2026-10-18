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

type AuthLandingPageProps = {
  onLogin: () => void;
};

export function AuthLandingPage({ onLogin }: AuthLandingPageProps) {
  return (
    <div id="top" className="min-h-screen bg-white text-brand-700">
      <header className="border-b border-slate-100 bg-white">
        <div className="mx-auto flex h-[76px] max-w-7xl items-center justify-between px-5 sm:px-8 lg:px-10">
          <a href="#top" className="flex items-center gap-3">
            <img src={logo} alt="College of Technologies logo" className="h-12 w-12 rounded-full object-contain" />
            <span className="border-l border-slate-200 pl-3 leading-tight text-brand-700">
              <span className="block text-sm font-extrabold tracking-[0.08em] sm:text-base">SAPES</span>
              <span className="mt-0.5 block max-w-64 text-[9px] font-medium tracking-normal text-slate-600 sm:text-[10px]">
                Student Enrollment &amp; Academic Status Management System
              </span>
            </span>
          </a>

          <nav className="hidden items-center gap-8 text-[11px] font-semibold uppercase tracking-wide text-slate-700 lg:flex">
            <a href="#top" className="border-b-2 border-brand-600 py-7 text-brand-600">Home</a>
            <a href="#about" className="hover:text-brand-600">About</a>
            <a href="#enrollment" className="hover:text-brand-600">Enrollment</a>
            <a href="#contact" className="hover:text-brand-600">Contact</a>
          </nav>

          <button
            type="button"
            onClick={onLogin}
            className="flex items-center gap-2 rounded-md bg-brand-600 px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-white shadow-sm transition-colors hover:bg-brand-700"
          >
            <UserRound className="h-4 w-4" />
            Login
          </button>
        </div>
      </header>

      <main>
        <section
          className="relative min-h-[470px] bg-cover bg-no-repeat px-5 py-16 sm:px-8 lg:px-10"
          style={{
            backgroundImage: `url(${schoolPhoto})`,
            backgroundPosition: 'center 48%',
          }}
        >
          <div className="relative z-10 mx-auto flex min-h-[370px] max-w-7xl items-center">
            <div className="max-w-[470px] bg-white/90 px-6 py-7 shadow-sm backdrop-blur-[2px] sm:px-8 sm:py-8">
              <span className="inline-block rounded-full bg-accent-500 px-3 py-1 text-xs font-semibold text-white">Welcome!</span>
              <h1 className="mt-4 text-4xl font-black leading-[1.05] tracking-tight text-brand-700 sm:text-5xl">
                Simplifying Enrollment.<br />
                Empowering Education.
              </h1>
              <p className="mt-4 max-w-[390px] text-sm leading-6 text-slate-700 sm:text-base">
                Our Enrollment Profiling System makes the enrollment process faster, easier, and more secure for students, parents, and staff.
              </p>
              <button
                type="button"
                onClick={onLogin}
                className="mt-6 flex items-center gap-3 rounded-md bg-accent-500 px-5 py-3 text-xs font-bold uppercase tracking-wide text-white transition-colors hover:bg-accent-700"
              >
                Login to System
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </section>

        <section id="about" className="px-5 py-14 sm:px-8 lg:px-10">
          <div className="mx-auto max-w-7xl">
            <div className="mb-9 text-center">
              <h2 className="text-2xl font-bold text-brand-700">What You Can Do</h2>
              <div className="mx-auto mt-3 h-0.5 w-9 bg-brand-600" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { icon: UserRound, title: 'Create Profile', text: 'Register and create your student profile securely online.' },
                { icon: FileText, title: 'Submit Requirements', text: 'Upload and manage all required documents in one place.' },
                { icon: ClipboardCheck, title: 'Track Application', text: 'Monitor the status of your enrollment application in real-time.' },
                { icon: LockKeyhole, title: 'Secure & Reliable', text: 'Your data is protected with our secure and reliable system.' },
              ].map(({ icon: Icon, title, text }) => (
                <article key={title} className="border border-slate-100 px-5 py-6 text-center shadow-soft">
                  <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-brand-50 text-brand-600">
                    <Icon className="h-10 w-10" strokeWidth={1.7} />
                  </div>
                  <h3 className="mt-5 text-sm font-bold text-brand-700">{title}</h3>
                  <p className="mt-2 text-xs leading-5 text-slate-600">{text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="enrollment" className="bg-brand-50 px-5 py-12 sm:px-8 lg:px-10">
          <div className="mx-auto grid max-w-7xl gap-10 md:grid-cols-2">
            <div>
              <UsersRound className="h-8 w-8 text-brand-600" />
              <h2 className="mt-4 text-xl font-bold text-brand-700">For Students</h2>
              <div className="mt-3 h-0.5 w-9 bg-brand-600" />
              <p className="mt-4 max-w-sm text-sm leading-6 text-slate-700">Access your academic records and manage your enrollment information using your institutional account.</p>
              <button type="button" onClick={onLogin} className="mt-5 flex items-center gap-3 rounded-md bg-brand-600 px-5 py-3 text-xs font-bold uppercase tracking-wide text-white hover:bg-brand-700">
                Student Login <ArrowRight className="h-4 w-4" />
              </button>
            </div>
            <div>
              <ShieldCheck className="h-8 w-8 text-brand-600" />
              <h2 className="mt-4 text-xl font-bold text-brand-700">For School Staff</h2>
              <div className="mt-3 h-0.5 w-9 bg-brand-600" />
              <p className="mt-4 max-w-sm text-sm leading-6 text-slate-700">Access the admin portal to manage applications, students, and reports.</p>
              <button type="button" onClick={onLogin} className="mt-5 flex items-center gap-3 rounded-md border border-brand-600 px-5 py-3 text-xs font-bold uppercase tracking-wide text-brand-600 hover:bg-white">
                Staff Login <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </section>
      </main>

      <footer id="contact" className="bg-brand-700 px-5 py-10 text-white sm:px-8 lg:px-10">
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
  );
}
