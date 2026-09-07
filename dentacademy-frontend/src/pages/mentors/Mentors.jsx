import { useEffect, useState } from 'react';
import api from '../../api/axios';
import Modal from '../../components/ui/Modal';
import { useToast } from '../../context/ToastContext';
import { SkeletonTable } from '../../components/ui/Skeleton';
import PageHeader from '../../components/ui/PageHeader';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Avatar from '../../components/ui/Avatar';
import AlertBanner from '../../components/ui/AlertBanner';
import EmptyState from '../../components/ui/EmptyState';
import { Plus } from 'lucide-react';

export default function Mentors() {
  const toast = useToast();
  const [mentors, setMentors] = useState([]);
  const [users, setUsers] = useState([]);
  const [apprentices, setApprentices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({
    user_id: '',
    name: '',
    surname: '',
    contact_number: '',
    email: '',
    specialisation: '',
  });
  const [saving, setSaving] = useState(false);

  const [assigning, setAssigning] = useState(null);
  const [assignForm, setAssignForm] = useState({ apprentice_id: '' });
  const [assigningSave, setAssigningSave] = useState(false);
  const [assignments, setAssignments] = useState({});

  const loadMentors = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get('/api/mentors');
      setMentors(res.data || []);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load mentors.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMentors();
    api
      .get('/api/users')
      .then((res) => setUsers(res.data || []))
      .catch(() => {});
    api
      .get('/api/apprentices', { params: { skip: 0, limit: 200 } })
      .then((res) => setApprentices(res.data.items || []))
      .catch(() => {});
  }, []);

  const openAssign = async (mentor) => {
    setAssigning(mentor);
    setAssignForm({ apprentice_id: '' });
    setError('');
    try {
      const res = await api.get(`/api/mentors/${mentor.mentor_id}/assignments`);
      setAssignments((prev) => ({
        ...prev,
        [mentor.mentor_id]: res.data || [],
      }));
    } catch {
      setAssignments((prev) => ({ ...prev, [mentor.mentor_id]: [] }));
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      await api.post('/api/mentors', {
        user_id: Number(createForm.user_id),
        name: createForm.name.trim(),
        surname: createForm.surname.trim(),
        contact_number: createForm.contact_number || undefined,
        email: createForm.email || undefined,
        specialisation: createForm.specialisation || undefined,
      });
      setShowCreate(false);
      setCreateForm({ user_id: '', name: '', surname: '', contact_number: '', email: '', specialisation: '' });
      toast.success('Mentor profile created.');
      loadMentors();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create mentor profile.');
    } finally {
      setSaving(false);
    }
  };

  const handleAssign = async (e) => {
    e.preventDefault();
    if (!assignForm.apprentice_id) return;

    setAssigningSave(true);
    setError('');

    try {
      await api.post(`/api/mentors/${assigning.mentor_id}/assign`, {
        apprentice_id: Number(assignForm.apprentice_id),
      });
      toast.success('Apprentice assigned.');
      await openAssign(assigning);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to assign apprentice.');
    } finally {
      setAssigningSave(false);
    }
  };

  const removeAssignment = async (assignmentId) => {
    try {
      await api.delete(
        `/api/mentors/${assigning.mentor_id}/assignments/${assignmentId}`
      );
      toast.success('Assignment removed.');
      await openAssign(assigning);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to remove assignment.');
    }
  };

  const mentorUsers = users.filter((u) => u.role === 'Mentor');
  const assignedNames = (mentorId) => {
    const list = assignments[mentorId] || [];
    return list.map((a) => `Apprentice #${a.apprentice_id}`).join(', ') || 'None';
  };

  const input = 'w-full border border-line rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-brand';
  const label = 'block text-sm font-medium text-ink mb-1';

  return (
    <div className="page-shell">
      <PageHeader title="Mentors" subtitle="Create mentor profiles from mentor users and assign apprentices." actions={
        <Button type="button" onClick={() => setShowCreate(true)} icon={Plus}>
          Add Mentor
        </Button>} />

      {error && (
        <AlertBanner type="error" message={error} className="mb-6" onDismiss={() => setError('')} />
      )}

      <Card padding={false}>
        {loading ? (
          <SkeletonTable rows={4} cols={6} />
        ) : mentors.length === 0 ? (
          <EmptyState title="No mentor profiles" description="Create a mentor profile from an existing mentor user." action={<Button onClick={() => setShowCreate(true)} icon={Plus}>Add Mentor</Button>} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-surface-muted/60">
                <tr>
                  <th className="text-left p-4 text-xs font-medium text-ink-muted uppercase tracking-wider">Mentor</th>
                  <th className="text-left p-4 text-xs font-medium text-ink-muted uppercase tracking-wider">Specialisation</th>
                  <th className="text-left p-4 text-xs font-medium text-ink-muted uppercase tracking-wider">Contact</th>
                  <th className="text-left p-4 text-xs font-medium text-ink-muted uppercase tracking-wider">Assigned Apprentices</th>
                  <th className="text-left p-4 text-xs font-medium text-ink-muted uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {mentors.map((mentor) => (
                  <tr key={mentor.mentor_id}>
                    <td className="p-4">
                      <div className="flex items-center gap-3"><Avatar name={`${mentor.name} ${mentor.surname}`} /><div><p className="font-medium text-ink">{mentor.name} {mentor.surname}</p><p className="meta-text">{mentor.email || 'No email'}</p></div></div>
                    </td>
                    <td className="p-4 text-ink-muted">{mentor.specialisation || 'N/A'}</td>
                    <td className="p-4 text-ink-muted">{mentor.contact_number || 'N/A'}</td>
                    <td className="p-4 text-ink-muted">{assignedNames(mentor.mentor_id)}</td>
                    <td className="p-4">
                      <button
                        type="button"
                        onClick={() => openAssign(mentor)}
                        className="text-brand hover:underline text-sm"
                      >
                        Manage Assignments
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Create mentor */}
      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Add Mentor">
        <form onSubmit={handleCreate} className="space-y-3">
          <div>
            <label className={label}>Mentor User *</label>
            <select
              className={input}
              value={createForm.user_id}
              onChange={(e) => {
                const user = users.find((u) => String(u.user_id) === e.target.value);
                setCreateForm({
                  ...createForm,
                  user_id: e.target.value,
                  name: user?.full_name?.split(' ')[0] || '',
                  surname: user?.full_name?.split(' ').slice(1).join(' ') || '',
                  email: user?.email || '',
                });
              }}
            >
              <option value="">Select user...</option>
              {mentorUsers.map((u) => (
                <option key={u.user_id} value={u.user_id}>
                  {u.full_name} ({u.username})
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={label}>Name</label>
              <input className={input} value={createForm.name} onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })} />
            </div>
            <div>
              <label className={label}>Surname</label>
              <input className={input} value={createForm.surname} onChange={(e) => setCreateForm({ ...createForm, surname: e.target.value })} />
            </div>
          </div>
          <div>
            <label className={label}>Specialisation</label>
            <input className={input} value={createForm.specialisation} onChange={(e) => setCreateForm({ ...createForm, specialisation: e.target.value })} />
          </div>
          <div>
            <label className={label}>Contact Number</label>
            <input className={input} value={createForm.contact_number} onChange={(e) => setCreateForm({ ...createForm, contact_number: e.target.value })} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" onClick={() => setShowCreate(false)} variant="secondary">
              Cancel
            </Button>
            <Button type="submit" loading={saving} disabled={!createForm.user_id}>
              {saving ? 'Creating...' : 'Create Mentor'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Assign apprentice */}
      <Modal
        isOpen={Boolean(assigning)}
        onClose={() => setAssigning(null)}
        title={assigning ? `Assign - ${assigning.name} ${assigning.surname}` : ''}
      >
        <form onSubmit={handleAssign} className="space-y-3">
          <div>
            <label className={label}>Apprentice</label>
            <select
              className={input}
              value={assignForm.apprentice_id}
              onChange={(e) => setAssignForm({ apprentice_id: e.target.value })}
            >
              <option value="">Select apprentice...</option>
              {apprentices
                .filter((a) => a.status === 'ACTIVE')
                .map((a) => (
                  <option key={a.apprentice_id} value={a.apprentice_id}>
                    {a.first_name} {a.surname}
                  </option>
                ))}
            </select>
          </div>
          <Button
            type="submit"
            loading={assigningSave}
            disabled={!assignForm.apprentice_id}
            className="w-full"
          >
            {assigningSave ? 'Assigning...' : 'Assign Apprentice'}
          </Button>
        </form>

        {assigning && (assignments[assigning.mentor_id] || []).length > 0 && (
          <div className="mt-6">
            <p className="text-sm font-medium text-ink mb-2">Current Assignments</p>
            <div className="divide-y">
              {(assignments[assigning.mentor_id] || []).map((a) => (
                <div key={a.assignment_id} className="py-2 flex items-center justify-between">
                  <span className="text-sm text-ink">
                    Apprentice #{a.apprentice_id}
                    {a.assigned_date ? ` (since ${new Date(a.assigned_date).toLocaleDateString()})` : ''}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeAssignment(a.assignment_id)}
                    className="text-red-600 hover:underline text-sm"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}