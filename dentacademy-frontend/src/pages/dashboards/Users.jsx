import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import { useToast } from '../../context/ToastContext';
import { SkeletonTable } from '../../components/ui/Skeleton';
import PageHeader from '../../components/ui/PageHeader';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge, { StatusBadge } from '../../components/ui/Badge';
import Avatar from '../../components/ui/Avatar';
import SearchBar from '../../components/ui/SearchBar';
import AlertBanner from '../../components/ui/AlertBanner';
import EmptyState from '../../components/ui/EmptyState';
import Modal from '../../components/ui/Modal';
import { Plus, RefreshCw } from 'lucide-react';

export default function Users() {
  const toast = useToast();
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [createdCredentials, setCreatedCredentials] = useState(null);
  const [newUser, setNewUser] = useState({
    full_name: '',
    email: '',
    role: 'Mentor',
    id_number: '',
    contact_number: '',
  });

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await api.get('/api/users');
      setUsers(response.data);
    } catch (err) {
      console.error('Failed to load users:', err);

      setError(
        err.response?.data?.detail ||
        'Failed to load users.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const filteredUsers = users.filter((user) => {
    const searchTerm = search.toLowerCase();

    const matchesSearch =
      user.username?.toLowerCase().includes(searchTerm) ||
      user.email?.toLowerCase().includes(searchTerm) ||
      user.full_name?.toLowerCase().includes(searchTerm);

    const matchesRole =
      roleFilter === 'All' || user.role === roleFilter;

    return matchesSearch && matchesRole;
  });

  const toggleUserStatus = async (user) => {
    try {
      await api.put(`/api/users/${user.user_id}`, {
        is_active: !user.is_active,
      });
      toast.success(
        user.is_active
          ? `${user.full_name || user.username} deactivated.`
          : `${user.full_name || user.username} activated.`
      );
      await loadUsers();
    } catch (err) {
      console.error('Failed to update user:', err);
      toast.error(
        err.response?.data?.detail ||
        'Failed to update user status.'
      );
    }
  };

  const handleCreateChange = (field, value) => {
    setNewUser((prev) => ({ ...prev, [field]: value }));
  };

  const openCreateModal = () => {
    setCreateError('');
    setCreatedCredentials(null);
    setNewUser({
      full_name: '',
      email: '',
      role: 'Mentor',
      id_number: '',
      contact_number: '',
    });
    setShowCreate(true);
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setCreateError('');

    const idNumber = newUser.id_number.trim();
    if (newUser.role === 'Apprentice' && !/^\d{13}$/.test(idNumber)) {
      setCreateError(
        'Apprentices need a 13-digit ID number so their apprentice record can be created.'
      );
      return;
    }

    setCreating(true);
    try {
      const payload = {
        full_name: newUser.full_name.trim(),
        email: newUser.email.trim(),
        role: newUser.role,
        id_number: idNumber || undefined,
        contact_number: newUser.contact_number.trim() || undefined,
      };
      const res = await api.post('/api/users', payload);
      setCreatedCredentials({
        username: res.data.username,
        password: res.data.dev_password || null,
        credentialsSent: res.data.credentials_sent,
        apprenticeId: res.data.apprentice_id || null,
        apprenticeRegistered: res.data.apprentice_registered ?? null,
        mentorId: res.data.mentor_id || null,
      });
      toast.success('User created successfully.');
      await loadUsers();
    } catch (err) {
      setCreateError(err.response?.data?.detail || 'Failed to create user.');
      toast.error(err.response?.data?.detail || 'Failed to create user.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="page-shell">
      {/* Header */}
      <PageHeader title="Users" subtitle="Manage DentAcademy system users and their roles." actions={<>
          <Button
            type="button"
            onClick={loadUsers}
            variant="secondary"
            icon={RefreshCw}
          >
            Refresh
          </Button>
          <Button
            type="button"
            onClick={openCreateModal}
            icon={Plus}
          >
            Create User
          </Button>
        </>} />

      {/* Search and filter */}
      <Card className="mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          <div>
            <label className="block text-sm font-medium text-ink mb-2">
              Search users
            </label>

            <SearchBar
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onSubmit={(e) => e.preventDefault()}
              onClear={() => setSearch('')}
              placeholder="Search by username, name or email..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-ink mb-2">
              Filter by role
            </label>

            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="w-full border border-line rounded-md px-4 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-brand"
            >
              <option value="All">All Roles</option>
              <option value="Administrator">Administrator</option>
              <option value="Supervisor">Supervisor</option>
              <option value="Mentor">Mentor</option>
              <option value="Apprentice">Apprentice</option>
            </select>
          </div>

        </div>
      </Card>

      {/* Error */}
      {error && (
        <AlertBanner type="error" message={error} className="mb-6" />
      )}

      {/* Users table */}
      <Card padding={false} className="overflow-hidden">

        {loading ? (
          <div className="p-6 text-ink-muted">
            <SkeletonTable rows={4} cols={5} />
          </div>
        ) : filteredUsers.length === 0 ? (
          <EmptyState title="No users found" description="Try changing the search or role filter." action={<Button onClick={openCreateModal} icon={Plus}>Create User</Button>} />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">

              <thead className="bg-surface-muted/60 border-b">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-medium text-ink-muted uppercase">
                    User
                  </th>

                  <th className="text-left px-6 py-3 text-xs font-medium text-ink-muted uppercase">
                    Email
                  </th>

                  <th className="text-left px-6 py-3 text-xs font-medium text-ink-muted uppercase">
                    Role
                  </th>

                  <th className="text-left px-6 py-3 text-xs font-medium text-ink-muted uppercase">
                    Status
                  </th>

                  <th className="text-right px-6 py-3 text-xs font-medium text-ink-muted uppercase">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y">

                {filteredUsers.map((user) => (
                  <tr key={user.user_id} className="hover:bg-surface-muted/60">

                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3"><Avatar name={user.full_name || user.username} /><div><div className="font-medium text-ink">{user.full_name || user.username}</div><div className="meta-text">@{user.username}</div></div></div>
                    </td>

                    <td className="px-6 py-4 text-sm text-ink-muted">
                      {user.email}
                    </td>

                    <td className="px-6 py-4">
                      <Badge text={user.role} color="blue" />
                    </td>

                    <td className="px-6 py-4">
                      <StatusBadge status={user.is_active ? 'ACTIVE' : 'INACTIVE'} />
                    </td>

                    <td className="px-6 py-4 text-right">
                      <button
                        type="button"
                        onClick={() => toggleUserStatus(user)}
                        className={`px-3 py-1 rounded-md text-sm font-medium ${
                          user.is_active
                            ? 'bg-red-100 text-red-700 hover:bg-red-200'
                            : 'bg-green-100 text-green-700 hover:bg-green-200'
                        }`}
                      >
                        {user.is_active
                          ? 'Deactivate'
                          : 'Activate'}
                      </button>
                    </td>

                  </tr>
                ))}

              </tbody>
            </table>
          </div>
        )}

      </Card>

      {/* Count */}
      {!loading && (
        <p className="text-sm text-ink-muted mt-4">
          Showing {filteredUsers.length} of {users.length} users
        </p>
      )}

      {/* Create User modal */}
      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Create User">

            {createdCredentials ? (
              <div className="p-6 space-y-4">
                <div className="bg-green-50 text-green-800 px-4 py-3 rounded-md">
                  User created successfully.
                  {createdCredentials.apprenticeId && (
                    <span className="block mt-1 text-sm">
                      Apprentice profile #{createdCredentials.apprenticeId} is linked to this
                      account
                      {createdCredentials.apprenticeRegistered
                        ? '.'
                        : ', but their registration is not complete yet.'}
                    </span>
                  )}
                  {createdCredentials.mentorId && (
                    <span className="block mt-1 text-sm">
                      Mentor profile #{createdCredentials.mentorId} is linked to this account.
                    </span>
                  )}
                </div>
                <div className="bg-surface-muted/60 border border-line rounded-md p-4">
                  <p className="text-sm text-ink-muted">Username</p>
                  <p className="font-mono font-semibold text-ink">{createdCredentials.username}</p>
                  {createdCredentials.password && (
                    <>
                      <p className="text-sm text-ink-muted mt-3">Password (development — email not configured)</p>
                      <p className="font-mono font-semibold text-ink">{createdCredentials.password}</p>
                    </>
                  )}
                  {createdCredentials.credentialsSent && (
                    <p className="text-sm text-ink-muted mt-3">
                      A password has been emailed to the user.
                    </p>
                  )}
                </div>
                <div className="flex justify-end gap-3">
                  {createdCredentials.apprenticeId &&
                    !createdCredentials.apprenticeRegistered && (
                    <button
                      type="button"
                      onClick={() =>
                        navigate(
                          `/apprentices/${createdCredentials.apprenticeId}/register`
                        )
                      }
                      className="bg-amber-600 text-white px-4 py-2 rounded-md hover:bg-amber-700"
                    >
                      Complete registration
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowCreate(false)}
                    className="bg-brand text-white px-4 py-2 rounded-md hover:bg-brand-dark"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleCreateUser} className="p-6 space-y-4">
                {createError && (
                  <div className="bg-red-50 text-red-700 px-4 py-3 rounded-md">{createError}</div>
                )}

                <div>
                  <label className="block text-sm font-medium text-ink mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={newUser.full_name}
                    onChange={(e) => handleCreateChange('full_name', e.target.value)}
                    className="w-full border border-line rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-brand"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-ink mb-1">Email *</label>
                  <input
                    type="email"
                    required
                    value={newUser.email}
                    onChange={(e) => handleCreateChange('email', e.target.value)}
                    className="w-full border border-line rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-brand"
                  />
                  <p className="text-xs text-ink-muted mt-1">
                    Login credentials are emailed to this address.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-ink mb-1">Role *</label>
                  <select
                    value={newUser.role}
                    onChange={(e) => handleCreateChange('role', e.target.value)}
                    className="w-full border border-line rounded-md px-4 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-brand"
                  >
                    <option value="Administrator">Administrator</option>
                    <option value="Supervisor">Supervisor</option>
                    <option value="Mentor">Mentor</option>
                    <option value="Apprentice">Apprentice</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-ink mb-1">
                    ID Number {newUser.role === 'Apprentice' && '*'}
                  </label>
                  <input
                    type="text"
                    required={newUser.role === 'Apprentice'}
                    value={newUser.id_number}
                    onChange={(e) => handleCreateChange('id_number', e.target.value.replace(/\D/g, '').slice(0, 13))}
                    className="w-full border border-line rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-brand"
                  />
                  {newUser.role === 'Apprentice' && (
                    <p className="text-xs text-ink-muted mt-1">
                      13 digits. An apprentice record is created with this ID, or the
                      existing apprentice with this ID is linked to the new account.
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-ink mb-1">Contact Number</label>
                  <input
                    type="text"
                    value={newUser.contact_number}
                    onChange={(e) => handleCreateChange('contact_number', e.target.value.replace(/\D/g, ''))}
                    className="w-full border border-line rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-brand"
                  />
                </div>

                <p className="text-xs text-ink-muted">
                  When no password is supplied, the system generates a secure
                  password from the user's credentials and emails the username
                  and password to them.
                </p>

                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowCreate(false)}
                    className="bg-surface-muted text-ink px-4 py-2 rounded-md hover:bg-surface-muted"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creating}
                    className="bg-brand text-white px-4 py-2 rounded-md hover:bg-brand-dark disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {creating ? 'Creating...' : 'Create User'}
                  </button>
                </div>
              </form>
            )}
      </Modal>
    </div>
  );
}