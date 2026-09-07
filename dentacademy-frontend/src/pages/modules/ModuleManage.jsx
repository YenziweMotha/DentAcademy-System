import { useEffect, useState } from 'react';
import api from '../../api/axios';
import { useToast } from '../../context/ToastContext';
import { SkeletonTable, SkeletonCard } from '../../components/ui/Skeleton';

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

  const input = 'w-full border border-gray-300 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-brand';
  const label = 'block text-sm font-medium text-gray-700 mb-1';

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800">Modules</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage the training modules that make up the programme. Inactive modules are excluded from completion calculations.
          </p>
        </div>

        <button type="button" onClick={() => setShowForm((v) => !v)} className="mt-4 md:mt-0 bg-brand text-white px-4 py-2 rounded-md hover:bg-brand-dark">
          {showForm ? 'Cancel' : 'Add Module'}
        </button>
      </div>

      {error && <div className="bg-red-50 text-red-700 px-4 py-3 rounded-md mb-6">{error}</div>}

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">New Module</h2>

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
            <button type="button" onClick={() => setShowForm(false)} className="bg-gray-200 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-300">
              Cancel
            </button>
            <button type="submit" disabled={saving || !formData.module_name.trim()} className="bg-brand text-white px-4 py-2 rounded-md hover:bg-brand-dark disabled:opacity-50 disabled:cursor-not-allowed">
              {saving ? 'Creating...' : 'Create Module'}
            </button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-lg shadow">
        {loading ? (
          <SkeletonTable rows={4} cols={4} />
        ) : modules.length === 0 ? (
          <div className="p-6 text-gray-500">No modules created yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left p-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Module</th>
                  <th className="text-left p-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                  <th className="text-left p-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Pass Mark</th>
                  <th className="text-left p-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="text-left p-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {modules.map((mod) => (
                  <tr key={mod.module_id}>
                    <td className="p-4">
                      <p className="font-medium text-gray-800">{mod.module_name}</p>
                      {mod.description && <p className="text-sm text-gray-500">{mod.description}</p>}
                    </td>
                    <td className="p-4 text-gray-600">{mod.category || 'N/A'}</td>
                    <td className="p-4 text-gray-600">{mod.pass_mark}%</td>
                    <td className="p-4">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${mod.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                        {mod.is_active ? 'Active' : 'Inactive'}
                      </span>
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
      </div>
    </div>
  );
}