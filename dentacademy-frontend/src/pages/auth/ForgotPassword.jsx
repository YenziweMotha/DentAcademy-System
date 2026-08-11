import { useState } from 'react';
import api from '../../api/axios';
import { Link } from 'react-router-dom';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import Spinner from '../../components/ui/Spinner';
import AlertBanner from '../../components/ui/AlertBanner';
import AuthShell from './AuthShell';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [devToken, setDevToken] = useState('');

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
        <div className="bg-emerald-50 text-emerald-700 px-4 py-3 rounded-md mb-4 text-sm">
          {message}
        </div>
      )}
      {error && (
        <div className="mb-4">
          <AlertBanner type="error" message={error} />
        </div>
      )}

      {devToken && (
        <div className="bg-yellow-50 text-yellow-800 px-4 py-3 rounded-md mb-4 text-sm break-all">
          <p className="font-medium">Development token (no SMTP configured):</p>
          <p className="mt-1">{devToken}</p>
        </div>
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

        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? (
            <span className="inline-flex items-center gap-2">
              <Spinner size="sm" /> Sending...
            </span>
          ) : (
            'Send Reset Link'
          )}
        </Button>
      </form>

      <p className="text-center text-sm text-gray-500 mt-6">
        Remembered your password?{' '}
        <Link to="/login" className="text-brand hover:underline">
          Back to login
        </Link>
      </p>
    </AuthShell>
  );
}
