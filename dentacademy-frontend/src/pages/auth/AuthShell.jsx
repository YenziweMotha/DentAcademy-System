import Logo from '../../components/ui/Logo';

export default function AuthShell({ title, subtitle, children }) {
  return (
    <div className="min-h-screen bg-gray-100 flex">
      <div className="hidden lg:flex w-1/2 bg-gradient-to-br from-brand-dark via-brand to-emerald-700 flex-col justify-between p-12 text-white">
        <div className="flex items-center gap-3">
          <Logo size={44} light />
          <div>
            <h1 className="text-2xl font-bold leading-tight">DentAcademy</h1>
            <p className="text-emerald-100 text-sm">Apprenticeship Program</p>
          </div>
        </div>

        <div className="space-y-8">
          <h2 className="text-4xl font-bold leading-tight max-w-md">
            Shaping the next generation of dental professionals.
          </h2>
          <p className="text-emerald-50 text-sm max-w-md leading-relaxed">
            Aspiring dental professionals completing accredited
            training through structured workplace apprenticeships.
          </p>
          <ul className="space-y-3 text-emerald-50 text-sm">
            <li className="flex items-center gap-3">
              <span className="h-1.5 w-1.5 rounded-full bg-white" />
              Learn under the guidance of experienced, registered practitioners
            </li>
            <li className="flex items-center gap-3">
              <span className="h-1.5 w-1.5 rounded-full bg-white" />
              Build the clinical competence and professionalism the dental industry trusts
            </li>
          </ul>
        </div>

        <p className="text-emerald-200/70 text-xs">
          © {new Date().getFullYear()} DentAcademy. All rights reserved.
        </p>
      </div>

      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-3 justify-center mb-8">
            <Logo size={40} />
            <div>
              <h1 className="text-2xl font-bold text-gray-800 leading-tight">
                DentAcademy
              </h1>
              <p className="text-gray-500 text-sm">Apprenticeship Program</p>
            </div>
          </div>

          <div className="bg-white py-8 px-6 sm:px-10 shadow sm:rounded-2xl">
            <h2 className="text-xl font-semibold text-gray-800 mb-1">{title}</h2>
            <p className="text-sm text-gray-500 mb-6">{subtitle}</p>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
