import { useEffect, useState } from 'react';
import api from '../../api/axios';
import { useToast } from '../../context/ToastContext';
import { SkeletonTable, SkeletonCard } from '../../components/ui/Skeleton';

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
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">
          System Settings
        </h1>
        <p className="text-gray-500 mt-1">
          Configure thresholds and security periods used across the
          system.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 px-4 py-3 rounded-md mb-6">
          {error}
        </div>
      )}

      {saved && (
        <div className="bg-green-50 text-green-700 px-4 py-3 rounded-md mb-6">
          Settings saved successfully.
        </div>
      )}

      <form
        onSubmit={handleSave}
        className="bg-white rounded-lg shadow p-6 space-y-6"
      >
        {loading ? (
          <SkeletonCard lines={4} />
        ) : (
          settings.map((setting) => (
            <div key={setting.key}>
              <label
                htmlFor={setting.key}
                className="block text-sm font-medium text-gray-700"
              >
                {labels[setting.key] || setting.key}
              </label>
              <input
                id={setting.key}
                type="number"
                min="1"
                value={setting.value}
                onChange={(e) =>
                  handleChange(setting.key, e.target.value)
                }
                className="mt-1 w-full md:w-96 border border-gray-300 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-brand"
              />
              <p className="text-sm text-gray-500 mt-1">
                {setting.description}
              </p>
            </div>
          ))
        )}

        {!loading && (
          <button
            type="submit"
            disabled={saving}
            className="bg-brand text-white px-5 py-2 rounded-md hover:bg-brand-dark disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        )}
      </form>
    </div>
  );
}