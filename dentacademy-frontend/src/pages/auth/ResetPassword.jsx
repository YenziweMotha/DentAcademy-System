import { useState } from 'react';
import api from '../../api/axios';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, AlertCircle } from 'lucide-react';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import AlertBanner from '../../components/ui/AlertBanner';
import { useToast } from '../../context/ToastContext';
import AuthShell from './AuthShell';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [email, setEmail] = useState(searchParams.get('email') || '');
  const [token, setToken] = useState(searchParams.get('token') || '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [capsLockOn, setCapsLockOn] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setMessage('');

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters.');
      setSubmitting(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      setSubmitting(false);
      return;
    }

    try {
      await api.post('/api/auth/reset-confirm', {
        email: email.trim(),
        token: token.trim(),
        new_password: newPassword,
      });
      setMessage('Password reset successfully. Redirecting to login...');
      toast.success('Password reset successfully. Please sign in.');
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to reset password.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell
      title="Set new password"
      subtitle="Enter your new password to complete the reset."
    >
      {message && (
        <AlertBanner type="success" message={message} className="mb-4" />
      )}
      {error && (
        <div className="mb-4">
          <AlertBanner type="error" message={error} />
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <Input
          label="Email Address"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <Input
          label="Reset Token"
          type="text"
          required
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="Paste the token from your email"
        />

        <div>
          <Input
            label="New Password"
            type={showPassword ? 'text' : 'password'}
            required
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            onKeyDown={(e) =>
              setCapsLockOn(e.getModifierState?.('CapsLock') ?? false)
            }
          />
          <div className="flex items-center justify-between mt-2">
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              className="inline-flex items-center gap-1.5 text-xs text-ink-muted hover:text-brand transition-colors focus-ring rounded"
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

        <Input
          label="Confirm Password"
          type={showPassword ? 'text' : 'password'}
          required
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />

        <Button type="submit" className="w-full" loading={submitting}>
          {submitting ? 'Resetting...' : 'Reset Password'}
        </Button>
      </form>

      <p className="text-center text-sm text-ink-muted mt-6">
        <Link to="/login" className="text-brand hover:underline">
          Back to login
        </Link>
      </p>
    </AuthShell>
  );
}
