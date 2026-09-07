import { useState } from 'react';
import api from '../../api/axios';
import { Link } from 'react-router-dom';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import AlertBanner from '../../components/ui/AlertBanner';
import { useToast } from '../../context/ToastContext';
import AuthShell from './AuthShell';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [devToken, setDevToken] = useState('');
  const toast = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setMessage('');
    setDevToken('');

    try {
      const res = await api.post('/api/auth/reset-request', {
        email: email.trim(),
      });
      setMessage(res.data.message || 'If that email is registered, a reset link has been sent.');
      toast.success('Password reset instructions requested.');
      if (res.data.dev_token) setDevToken(res.data.dev_token);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to send reset email.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell
      title="Reset your password"
      subtitle="Enter your email to receive a password reset link."
    >
      {message && (
        <AlertBanner type="success" message={message} className="mb-4" />
      )}
      {error && (
        <div className="mb-4">
          <AlertBanner type="error" message={error} />
        </div>
      )}

      {devToken && (
        <AlertBanner type="warning" className="mb-4" message={`Development token (no SMTP configured): ${devToken}`} />
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <Input
          label="Email Address"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.co.za"
        />

        <Button type="submit" className="w-full" loading={submitting}>
          {submitting ? 'Sending...' : 'Send Reset Link'}
        </Button>
      </form>

      <p className="text-center text-sm text-ink-muted mt-6">
        Remembered your password?{' '}
        <Link to="/login" className="text-brand hover:underline">
          Back to login
        </Link>
      </p>
    </AuthShell>
  );
}
