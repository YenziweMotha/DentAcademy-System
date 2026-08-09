import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import AlertBanner from '../components/ui/AlertBanner';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login, user, loading: authLoading } = useAuth();
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
      navigate(destination, { replace: true });
    }
  }, [
    user,
    authLoading,
    navigate,
    location.pathname,
    location.state,
  ]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError('');
    setLoading(true);

    try {
      await login(username, password);
    } catch (err) {
      setError(
        err.response?.data?.detail ||
        'Login failed. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        Loading...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold">
            DentAcademy
          </h1>

          <p className="mt-2 text-gray-600">
            Management Portal • Apprenticeship Program
          </p>
        </div>

        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {error && (
            <AlertBanner
              type="error"
              message={error}
            />
          )}

          <form
            className="space-y-6"
            onSubmit={handleSubmit}
          >
            <Input
              label="Username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />

            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <div className="pt-2">
              <Button
                type="submit"
                className="w-full"
                disabled={loading}
              >
                {loading ? 'Signing in...' : 'Sign in'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}