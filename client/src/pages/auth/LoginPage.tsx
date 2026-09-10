import { AuthLayout } from './AuthLayout';

type LoginPageProps = {
  onLoginSuccess: () => void;
};

export default function LoginPage({ onLoginSuccess }: LoginPageProps) {
  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onLoginSuccess();
  };

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to continue managing your academic records and student information."
      footerText="Don’t have an account?"
      footerLinkText="Create one"
      footerLinkHref="/signup"
    >
      <form className="space-y-5" onSubmit={handleSubmit}>
        <div>
          <label htmlFor="email" className="mb-2 block text-sm font-medium text-slate-700">
            Email address
          </label>
          <input
            id="email"
            name="email"
            type="email"
            placeholder="name@school.edu"
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-100"
          />
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <label htmlFor="password" className="text-sm font-medium text-slate-700">
              Password
            </label>
            <a href="/forgot-password" className="text-xs font-medium text-indigo-600 hover:text-indigo-500">
              Forgot password?
            </a>
          </div>
          <input
            id="password"
            type="password"
            placeholder="Enter your password"
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-100"
          />
        </div>

        <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
          <label htmlFor="remember" className="flex items-center gap-2 text-sm text-slate-600">
            <input id="remember" type="checkbox" className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
            Remember me
          </label>
          <span className="text-xs font-medium uppercase tracking-wide text-slate-400">Secure login</span>
        </div>

        <button
          type="submit"
          className="w-full rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-200"
        >
          Login
        </button>
      </form>
    </AuthLayout>
  );
}
