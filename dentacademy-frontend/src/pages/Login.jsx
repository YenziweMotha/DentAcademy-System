import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Eye, EyeOff, AlertCircle, ArrowRight } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../context/ToastContext';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import Logo from '../components/ui/Logo';
import AlertBanner from '../components/ui/AlertBanner';
import brandImage from '../auto-mechanic-working-underneath-car-lifting-machine-at-the-garage-auto-repair-shop-car-service-repair-3-video.jpg';

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
    document.documentElement.classList.remove('dark');
  }, []);

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
        err.response?.data?.detail || 'Login failed. Please try again.';
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
      <div className="flex h-screen items-center justify-center bg-surface">
        <div className="h-12 w-12 rounded-full border-4 border-brand/20 border-t-brand animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-[#07111F]">
      {/* Full-bleed atmosphere */}
      <div className="absolute inset-0">
        <img
          src={brandImage}
          alt=""
          className="h-full w-full object-cover scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-[#07111F]/92 via-[#0B1F3A]/78 to-[#0B5FFF]/55" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgb(11_95_255_/_0.35),transparent_42%),radial-gradient(circle_at_80%_80%,rgb(255_107_44_/_0.22),transparent_40%)]" />
      </div>

      <div className="relative z-10 min-h-screen grid lg:grid-cols-2">
        {/* Brand story */}
        <div className="hidden lg:flex flex-col justify-between p-12 xl:p-16 text-white">
          <div className="flex items-center gap-3 animate-fade-up">
            <Logo size={48} light />
            <div>
              <p className="text-4xl font-extrabold tracking-tight leading-none">
                DentAcademy
              </p>
              <p className="text-blue-100/80 text-sm mt-1 tracking-wide">
                Apprenticeship Program
              </p>
            </div>
          </div>

          <div className="max-w-xl space-y-6 animate-fade-up" style={{ animationDelay: '80ms' }}>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-accent">
              Built for real workshops
            </p>
            <h2 className="text-5xl xl:text-6xl font-extrabold leading-[1.05] tracking-tight">
              Train with clarity.
              <span className="block text-blue-200/90">Lead with confidence.</span>
            </h2>
            <p className="text-blue-50/85 text-base leading-relaxed max-w-md">
              One modern portal for apprentices, mentors, and supervisors —
              progress, evaluations, and performance in a single polished experience.
            </p>
          </div>

          <p className="text-blue-200/55 text-xs animate-fade-up" style={{ animationDelay: '140ms' }}>
            © {new Date().getFullYear()} DentAcademy. All rights reserved.
          </p>
        </div>

        {/* Sign-in panel */}
        <div className="flex items-center justify-center px-5 py-10 sm:px-8">
          <div
            key={shakeKey}
            className={`w-full max-w-[420px] ${shakeKey ? 'shake' : ''}`}
          >
            <div className="lg:hidden flex items-center gap-3 justify-center mb-8 text-white">
              <Logo size={40} light />
              <div>
                <h1 className="text-2xl font-extrabold leading-tight">DentAcademy</h1>
                <p className="text-blue-100/80 text-sm">Apprenticeship Program</p>
              </div>
            </div>

            <div className="rounded-[1.75rem] bg-white p-7 sm:p-9 shadow-[0_30px_80px_rgb(0_0_0_/_0.35)] animate-scale-in">
              <div className="mb-7">
                <h2 className="text-2xl font-extrabold text-ink tracking-tight">
                  Welcome back
                </h2>
                <p className="text-sm text-ink-muted mt-1.5">
                  Sign in to continue to your workspace.
                </p>
              </div>

              {error && (
                <div className="mb-4">
                  <AlertBanner type="error" message={error} />
                </div>
              )}

              <form className="space-y-4" onSubmit={handleSubmit}>
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
                      className="inline-flex items-center gap-1.5 text-xs text-ink-muted hover:text-brand transition-colors"
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

                <Button type="submit" className="w-full !py-3 !text-base" loading={loading}>
                  {loading ? 'Signing in...' : (
                    <span className="inline-flex items-center gap-2">
                      Sign in <ArrowRight size={16} />
                    </span>
                  )}
                </Button>
              </form>

              <p className="text-center text-sm text-ink-muted mt-6">
                <Link to="/forgot-password" className="text-brand font-semibold hover:underline">
                  Forgot password?
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
