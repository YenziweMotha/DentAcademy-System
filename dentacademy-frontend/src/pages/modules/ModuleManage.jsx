import { useEffect, useState } from 'react';
import api from '../../api/axios';
import { useToast } from '../../context/ToastContext';
import { SkeletonTable } from '../../components/ui/Skeleton';
import PageHeader from '../../components/ui/PageHeader';
import Card, { CardHeader } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge, { StatusBadge } from '../../components/ui/Badge';
import AlertBanner from '../../components/ui/AlertBanner';
import EmptyState from '../../components/ui/EmptyState';
import { Plus } from 'lucide-react';

export default function ModuleManage() {
  const toast = useToast();
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    module_name: '',
    description: '',
    category: '',
    pass_mark: '50',
  });
  const [saving, setSaving] = useState(false);

  const loadModules = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await api.get('/api/modules');
      setModules(response.data || []);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load modules.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadModules();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      await api.post('/api/modules', {
        module_name: formData.module_name.trim(),
        description: formData.description.trim() || undefined,
        category: formData.category.trim() || undefined,
        pass_mark: formData.pass_mark === '' ? undefined : Number(formData.pass_mark),
      });
      setFormData({ module_name: '', description: '', category: '', pass_mark: '50' });
      setShowForm(false);
      toast.success('Module created.');
      loadModules();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create module.');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (mod) => {
    try {
      await api.put(`/api/modules/${mod.module_id}`, {
        module_name: mod.module_name,
        description: mod.description,
        category: mod.category,
        pass_mark: mod.pass_mark,
        is_active: !mod.is_active,
      });
      toast.success(`Module ${mod.is_active ? 'deactivated' : 'activated'}.`);
      loadModules();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to update module.');
    }
  };

  const input = 'w-full border border-line rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-brand';
  const label = 'block text-sm font-medium text-ink mb-1';

  return (
    <div className="page-shell">
      <PageHeader title="Modules" subtitle="Manage training modules. Inactive modules are excluded from completion calculations." actions={
        <Button type="button" onClick={() => setShowForm((v) => !v)} icon={showForm ? undefined : Plus} variant={showForm ? 'secondary' : 'primary'}>
          {showForm ? 'Cancel' : 'Add Module'}
        </Button>} />

      {error && <AlertBanner type="error" message={error} className="mb-6" />}

      {showForm && (
        <Card as="form" onSubmit={handleSubmit} className="mb-6 animate-fade-up">
          <CardHeader title="New Module" />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={label}>Module Name *</label>
              <input className={input} value={formData.module_name} onChange={(e) => setFormData({ ...formData, module_name: e.target.value })} />
            </div>
            <div>
              <label className={label}>Category</label>
              <input className={input} value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} />
            </div>
            <div className="md:col-span-2">
              <label className={label}>Description</label>
              <textarea rows="2" className={input} value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
            </div>
            <div>
              <label className={label}>Pass Mark (%)</label>
              <input type="number" min="0" max="100" className={input} value={formData.pass_mark} onChange={(e) => setFormData({ ...formData, pass_mark: e.target.value })} />
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <Button type="button" onClick={() => setShowForm(false)} variant="secondary">
              Cancel
            </Button>
            <Button type="submit" loading={saving} disabled={!formData.module_name.trim()}>
              {saving ? 'Creating...' : 'Create Module'}
            </Button>
          </div>
        </Card>
      )}

      <Card padding={false}>
        {loading ? (
          <SkeletonTable rows={4} cols={4} />
        ) : modules.length === 0 ? (
          <EmptyState title="No modules yet" description="Create the first training module to begin tracking progress." action={<Button onClick={() => setShowForm(true)} icon={Plus}>Add Module</Button>} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-surface-muted/60">
                <tr>
                  <th className="text-left p-4 text-xs font-medium text-ink-muted uppercase tracking-wider">Module</th>
                  <th className="text-left p-4 text-xs font-medium text-ink-muted uppercase tracking-wider">Category</th>
                  <th className="text-left p-4 text-xs font-medium text-ink-muted uppercase tracking-wider">Pass Mark</th>
                  <th className="text-left p-4 text-xs font-medium text-ink-muted uppercase tracking-wider">Status</th>
                  <th className="text-left p-4 text-xs font-medium text-ink-muted uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {modules.map((mod) => (
                  <tr key={mod.module_id}>
                    <td className="p-4">
                      <p className="font-medium text-ink">{mod.module_name}</p>
                      {mod.description && <p className="text-sm text-ink-muted">{mod.description}</p>}
                    </td>
                    <td className="p-4 text-ink-muted">{mod.category || 'N/A'}</td>
                    <td className="p-4 text-ink-muted">{mod.pass_mark}%</td>
                    <td className="p-4">
                      <StatusBadge status={mod.is_active ? 'ACTIVE' : 'INACTIVE'} />
                    </td>
                    <td className="p-4">
                      <button type="button" onClick={() => toggleActive(mod)} className="text-brand hover:underline text-sm">
                        {mod.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}