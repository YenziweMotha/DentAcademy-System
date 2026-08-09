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
    if (user && !authLoading) {
      const from = location.state?.from?.pathname || `/dashboard/${user.role.toLowerCase()}`;
      navigate(from, { replace: true });
    }
  }, [user, authLoading, navigate, location]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      await login(username, password);
    } catch (err) {
      setError(err.response?.data?.detail || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) return <div>Loading...</div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-primary-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-bold text-slate-900">DentAcademy</h1>
          <p className="text-sm text-slate-500 mt-1">Apprenticeship Management Portal</p>
        </div>

        <div className="bg-white shadow-lg rounded-xl p-6 border">
          {error && <AlertBanner type="error" message={error} />}

          <form className="space-y-5" onSubmit={handleSubmit}>
            <Input
              label="Username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              required
            />

            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
            />

            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2">
                <input type="checkbox" className="rounded border-gray-300" />
                Remember me
              </label>
              <span className="text-primary-600 cursor-pointer hover:underline">
                Forgot password?
              </span>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign in'}
            </Button>
          </form>
        </div>

        <p className="text-center text-xs text-slate-400 mt-4">
          © {new Date().getFullYear()} DentAcademy
        </p>
      </div>
    </div>
  );
}
