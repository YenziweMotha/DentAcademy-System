import Logo from '../../components/ui/Logo';

export default function AuthShell({ title, subtitle, children }) {
  return (
    <div className="min-h-screen relative overflow-hidden bg-[#07111F]">
      <div className="absolute inset-0 bg-gradient-to-br from-[#07111F] via-[#0B1F3A] to-[#0B5FFF]/70" />
      <div className="absolute -top-24 -left-24 h-80 w-80 rounded-full bg-brand/30 blur-3xl" />
      <div className="absolute -bottom-24 -right-24 h-80 w-80 rounded-full bg-accent/25 blur-3xl" />

      <div className="relative z-10 min-h-screen grid lg:grid-cols-2">
        <div className="hidden lg:flex flex-col justify-between p-12 text-white">
          <div className="flex items-center gap-3">
            <Logo size={44} light />
            <div>
              <h1 className="text-2xl font-extrabold leading-tight">DentAcademy</h1>
              <p className="text-blue-100/80 text-sm">Apprenticeship Program</p>
            </div>
          </div>

          <div className="space-y-5 max-w-md">
            <h2 className="text-4xl font-extrabold leading-tight tracking-tight">
              A portal that looks as sharp as the craft it supports.
            </h2>
            <p className="text-blue-50/80 text-sm leading-relaxed">
              Structured apprenticeships, clear progress, and mentor guidance —
              all in one place.
            </p>
          </div>

          <p className="text-blue-200/55 text-xs">
            © {new Date().getFullYear()} DentAcademy. All rights reserved.
          </p>
        </div>

        <div className="flex items-center justify-center px-6 py-12">
          <div className="w-full max-w-md">
            <div className="lg:hidden flex items-center gap-3 justify-center mb-8 text-white">
              <Logo size={40} light />
              <div>
                <h1 className="text-2xl font-extrabold leading-tight">DentAcademy</h1>
                <p className="text-blue-100/80 text-sm">Apprenticeship Program</p>
              </div>
            </div>

            <div className="rounded-[1.75rem] bg-white p-7 sm:p-9 shadow-[0_30px_80px_rgb(0_0_0_/_0.3)] animate-fade-up">
              <h2 className="text-xl font-extrabold text-ink mb-1 tracking-tight">{title}</h2>
              <p className="text-sm text-ink-muted mb-6">{subtitle}</p>
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
