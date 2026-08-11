import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Eye, EyeOff, AlertCircle } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../context/ToastContext';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import Spinner from '../components/ui/Spinner';
import Logo from '../components/ui/Logo';
import AlertBanner from '../components/ui/AlertBanner';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [capsLockOn, setCapsLockOn] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [shakeKey, setShakeKey] = useState(0);

  const { login, user, loading: authLoading } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (authLoading || !user) return;

    const roleRoutes = {
      Administrator: '/dashboard/admin',
      Supervisor: '/dashboard/supervisor',
      Mentor: '/dashboard/mentor',
      Apprentice: '/dashboard/apprentice',
    };

    const from = location.state?.from?.pathname;
    const destination = from || roleRoutes[user.role];

    if (destination && location.pathname === '/login') {
      toast.success(`Welcome back, ${user.full_name || user.username}!`);
      navigate(destination, { replace: true });
    }
  }, [
    user,
    authLoading,
    navigate,
    location.pathname,
    location.state,
    toast,
  ]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError('');
    setLoading(true);

    try {
      await login(username, password);
    } catch (err) {
      const message =
        err.response?.data?.detail ||
        'Login failed. Please try again.';
      setError(message);
      setShakeKey((k) => k + 1);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    setCapsLockOn(e.getModifierState?.('CapsLock') ?? false);
  };

  if (authLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-100">
        <Spinner size="lg" className="text-brand" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* Brand panel */}
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

      {/* Form panel */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div key={shakeKey} className={`w-full max-w-md ${shakeKey ? 'shake' : ''}`}>
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
            <h2 className="text-xl font-semibold text-gray-800 mb-1">
              Sign in to your account
            </h2>
            <p className="text-sm text-gray-500 mb-6">
              Enter your credentials to access the portal.
            </p>

            {error && (
              <div className="mb-4">
                <AlertBanner type="error" message={error} />
              </div>
            )}

            <form className="space-y-5" onSubmit={handleSubmit}>
              <Input
                label="Username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                required
              />

              <div>
                <Input
                  label="Password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={handleKeyDown}
                  autoComplete="current-password"
                  required
                />
                <div className="flex items-center justify-between mt-2">
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-brand transition-colors"
                  >
                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    {showPassword ? 'Hide password' : 'Show password'}
                  </button>
                  {capsLockOn && (
                    <span className="inline-flex items-center gap-1 text-xs text-amber-600">
                      <AlertCircle size={14} /> Caps Lock is on
                    </span>
                  )}
                </div>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={loading}
              >
                {loading ? (
                  <span className="inline-flex items-center gap-2">
                    <Spinner size="sm" /> Signing in...
                  </span>
                ) : (
                  'Sign in'
                )}
              </Button>
            </form>

            <p className="text-center text-sm text-gray-500 mt-6">
              <Link
                to="/forgot-password"
                className="text-brand hover:underline"
              >
                Forgot password?
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
