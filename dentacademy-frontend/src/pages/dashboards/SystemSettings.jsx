import { useEffect, useState } from 'react';
import api from '../../api/axios';
import { useToast } from '../../context/ToastContext';
import { SkeletonCard } from '../../components/ui/Skeleton';
import PageHeader from '../../components/ui/PageHeader';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import AlertBanner from '../../components/ui/AlertBanner';

export default function SystemSettings() {
  const toast = useToast();
  const [settings, setSettings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get('/api/config')
      .then((res) => {
        setSettings(res.data);
        setLoading(false);
      })
      .catch(() => {
        setError('Failed to load system settings.');
        setLoading(false);
      });
  }, []);

  const handleChange = (key, value) => {
    setSettings((prev) =>
      prev.map((s) => (s.key === key ? { ...s, value } : s))
    );
    setSaved(false);
  };

  const handleSave = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');

    const payload = {};
    settings.forEach((s) => {
      payload[s.key] = s.value;
    });

    try {
      const res = await api.put('/api/config', { settings: payload });
      setSettings(res.data);
      setSaved(true);
      toast.success('System settings saved.');
    } catch (err) {
      setError(
        err.response?.data?.detail || 'Failed to save system settings.'
      );
      toast.error(
        err.response?.data?.detail || 'Failed to save system settings.'
      );
    } finally {
      setSaving(false);
    }
  };

  const labels = {
    evaluation_alert_days: 'Evaluation Alert Period (days)',
    dropout_risk_threshold: 'Dropout Risk Threshold (%)',
    account_lockout_minutes: 'Account Lockout Duration (minutes)',
    password_reset_expire_minutes: 'Password Reset Expiry (minutes)',
  };

  return (
    <div className="page-shell">
      <PageHeader title="System Settings" subtitle="Configure thresholds and security periods used across the system." />

      {error && (
        <AlertBanner type="error" message={error} className="mb-6" />
      )}

      {saved && (
        <AlertBanner type="success" message="Settings saved successfully." className="mb-6" />
      )}

      <Card as="form"
        onSubmit={handleSave}
        className="space-y-6 animate-fade-up"
      >
        {loading ? (
          <SkeletonCard lines={4} />
        ) : (
          settings.map((setting) => (
            <Input
                key={setting.key}
                id={setting.key}
                label={labels[setting.key] || setting.key}
                type="number"
                min="1"
                value={setting.value}
                onChange={(e) =>
                  handleChange(setting.key, e.target.value)
                }
                className="max-w-md"
                hint={setting.description}
              />
          ))
        )}

        {!loading && (
          <Button
            type="submit"
            loading={saving}
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </Button>
        )}
      </Card>
    </div>
  );
}