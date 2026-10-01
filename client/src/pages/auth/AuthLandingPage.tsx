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
import logo from '../../assets/branding/coloredlogo.png';
import schoolPhoto from '../../assets/branding/landingpage.png';

type AuthLandingPageProps = {
  onLogin: () => void;
};

export function AuthLandingPage({ onLogin }: AuthLandingPageProps) {
  return (
    <div className="min-h-screen bg-white text-[#102d5b]">
      <header className="border-b border-slate-100 bg-white">
        <div className="mx-auto flex h-[76px] max-w-7xl items-center justify-between px-5 sm:px-8 lg:px-10">
          <a href="#top" className="flex items-center gap-3">
            <img src={logo} alt="Bukidnon State University logo" className="h-12 w-12 object-contain" />
            <span className="border-l border-slate-200 pl-3 text-sm font-bold leading-tight tracking-[0.04em] text-[#102d5b] sm:text-base">
              BUKIDNON STATE UNIVERSITY
            </span>
          </a>

          <nav className="hidden items-center gap-8 text-[11px] font-semibold uppercase tracking-wide text-slate-700 lg:flex">
            <a href="#top" className="border-b-2 border-[#123b78] py-7 text-[#123b78]">Home</a>
            <a href="#about" className="hover:text-[#123b78]">About</a>
            <a href="#enrollment" className="hover:text-[#123b78]">Enrollment</a>
            <a href="#guidelines" className="hover:text-[#123b78]">Guidelines</a>
            <a href="#contact" className="hover:text-[#123b78]">Contact</a>
          </nav>

          <button
            type="button"
            onClick={onLogin}
            className="flex items-center gap-2 rounded-md bg-[#123b78] px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-white shadow-sm transition-colors hover:bg-[#0c2a58]"
          >
            <UserRound className="h-4 w-4" />
            Login
          </button>
        </div>
      </header>

      <main id="top">
        <section
          className="relative min-h-[470px] bg-cover bg-no-repeat px-5 py-16 sm:px-8 lg:px-10"
          style={{
            backgroundImage: `url(${schoolPhoto})`,
            backgroundPosition: '40% bottom',
          }}
        >
          <div className="relative z-10 mx-auto flex min-h-[370px] max-w-7xl items-center">
            <div className="max-w-[470px] bg-white/90 px-6 py-7 shadow-sm backdrop-blur-[2px] sm:px-8 sm:py-8">
              <span className="inline-block rounded-full bg-[#123b78] px-3 py-1 text-xs font-semibold text-white">Welcome!</span>
              <h1 className="mt-4 text-4xl font-black leading-[1.05] tracking-tight text-[#102d5b] sm:text-5xl">
                Simplifying Enrollment.<br />
                Empowering Education.
              </h1>
              <p className="mt-4 max-w-[390px] text-sm leading-6 text-slate-700 sm:text-base">
                Our Enrollment Profiling System makes the enrollment process faster, easier, and more secure for students, parents, and staff.
              </p>
              <button
                type="button"
                onClick={onLogin}
                className="mt-6 flex items-center gap-3 rounded-md bg-[#123b78] px-5 py-3 text-xs font-bold uppercase tracking-wide text-white transition-colors hover:bg-[#0c2a58]"
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
              <h2 className="text-2xl font-bold text-[#102d5b]">What You Can Do</h2>
              <div className="mx-auto mt-3 h-0.5 w-9 bg-[#123b78]" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { icon: UserRound, title: 'Create Profile', text: 'Register and create your student profile securely online.' },
                { icon: FileText, title: 'Submit Requirements', text: 'Upload and manage all required documents in one place.' },
                { icon: ClipboardCheck, title: 'Track Application', text: 'Monitor the status of your enrollment application in real-time.' },
                { icon: LockKeyhole, title: 'Secure & Reliable', text: 'Your data is protected with our secure and reliable system.' },
              ].map(({ icon: Icon, title, text }) => (
                <article key={title} className="border border-slate-100 px-5 py-6 text-center shadow-[0_3px_18px_rgba(16,45,91,0.05)]">
                  <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[#edf5fc] text-[#123b78]">
                    <Icon className="h-10 w-10" strokeWidth={1.7} />
                  </div>
                  <h3 className="mt-5 text-sm font-bold text-[#102d5b]">{title}</h3>
                  <p className="mt-2 text-xs leading-5 text-slate-600">{text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="enrollment" className="bg-[#eef8ff] px-5 py-12 sm:px-8 lg:px-10">
          <div className="mx-auto grid max-w-7xl gap-10 md:grid-cols-2">
            <div>
              <UsersRound className="h-8 w-8 text-[#123b78]" />
              <h2 className="mt-4 text-xl font-bold text-[#102d5b]">For Students</h2>
              <div className="mt-3 h-0.5 w-9 bg-[#123b78]" />
              <p className="mt-4 max-w-sm text-sm leading-6 text-slate-700">Access your academic records and manage your enrollment information using your institutional account.</p>
              <button type="button" onClick={onLogin} className="mt-5 flex items-center gap-3 rounded-md bg-[#123b78] px-5 py-3 text-xs font-bold uppercase tracking-wide text-white hover:bg-[#0c2a58]">
                Student Login <ArrowRight className="h-4 w-4" />
              </button>
            </div>
            <div id="guidelines">
              <ShieldCheck className="h-8 w-8 text-[#123b78]" />
              <h2 className="mt-4 text-xl font-bold text-[#102d5b]">For School Staff</h2>
              <div className="mt-3 h-0.5 w-9 bg-[#123b78]" />
              <p className="mt-4 max-w-sm text-sm leading-6 text-slate-700">Access the admin portal to manage applications, students, and reports.</p>
              <button type="button" onClick={onLogin} className="mt-5 flex items-center gap-3 rounded-md border border-[#123b78] px-5 py-3 text-xs font-bold uppercase tracking-wide text-[#123b78] hover:bg-white">
                Staff Login <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </section>
      </main>

      <footer id="contact" className="bg-[#062d61] px-5 py-10 text-white sm:px-8 lg:px-10">
        <div className="mx-auto grid max-w-7xl gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: ShieldCheck, title: 'Our Mission', text: 'To deliver an efficient, transparent, and student-centered enrollment experience.' },
            { icon: Megaphone, title: 'Announcements', text: 'Stay updated with the latest enrollment schedules and important reminders.' },
            { icon: HelpCircle, title: 'Need Help?', text: 'Check our FAQs or contact our support team.' },
            { icon: Phone, title: 'Contact Us', text: '(02) 8123 4567\nenrollment@bsu.edu.ph\nMalaybalay City, Philippines' },
          ].map(({ icon: Icon, title, text }) => (
            <div key={title} className="border-l border-white/15 pl-4">
              <div className="flex items-center gap-3 text-sm font-semibold"><Icon className="h-6 w-6 text-[#8fc8f2]" />{title}</div>
              <p className="mt-4 whitespace-pre-line text-xs leading-5 text-blue-100">{text}</p>
            </div>
          ))}
        </div>
        <div className="mx-auto mt-9 flex max-w-7xl flex-col justify-between gap-2 border-t border-white/15 pt-4 text-[11px] text-blue-100 sm:flex-row">
          <span>© 2026 Bukidnon State University. All rights reserved.</span>
          <span>Privacy Policy &nbsp; | &nbsp; Terms of Use</span>
        </div>
      </footer>
    </div>
  );
}
