import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import { useToast } from '../../context/ToastContext';
import { SkeletonTable, SkeletonCard } from '../../components/ui/Skeleton';

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
    <div>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800">
            Users
          </h1>

          <p className="text-sm text-gray-500 mt-1">
            Manage DentAcademy system users and their roles.
          </p>
        </div>

        <div className="flex gap-3 mt-4 md:mt-0">
          <button
            type="button"
            onClick={loadUsers}
            className="bg-gray-200 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-300"
          >
            Refresh
          </button>
          <button
            type="button"
            onClick={openCreateModal}
            className="bg-brand text-white px-4 py-2 rounded-md hover:bg-brand-dark"
          >
            + Create User
          </button>
        </div>
      </div>

      {/* Search and filter */}
      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search users
            </label>

            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by username, name or email..."
              className="w-full border border-gray-300 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-brand"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Filter by role
            </label>

            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-4 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-brand"
            >
              <option value="All">All Roles</option>
              <option value="Administrator">Administrator</option>
              <option value="Supervisor">Supervisor</option>
              <option value="Mentor">Mentor</option>
              <option value="Apprentice">Apprentice</option>
            </select>
          </div>

        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg mb-6">
          {error}
        </div>
      )}

      {/* Users table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">

        {loading ? (
          <div className="p-6 text-gray-500">
            <SkeletonTable rows={4} cols={5} />
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-6 text-gray-500">
            No users found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">

              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                    User
                  </th>

                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                    Email
                  </th>

                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                    Role
                  </th>

                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                    Status
                  </th>

                  <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y">

                {filteredUsers.map((user) => (
                  <tr key={user.user_id} className="hover:bg-gray-50">

                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-800">
                        {user.full_name || user.username}
                      </div>

                      <div className="text-sm text-gray-500">
                        @{user.username}
                      </div>
                    </td>

                    <td className="px-6 py-4 text-sm text-gray-600">
                      {user.email}
                    </td>

                    <td className="px-6 py-4">
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                        {user.role}
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      {user.is_active ? (
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                          Inactive
                        </span>
                      )}
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

      </div>

      {/* Count */}
      {!loading && (
        <p className="text-sm text-gray-500 mt-4">
          Showing {filteredUsers.length} of {users.length} users
        </p>
      )}

      {/* Create User modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-lg font-semibold text-gray-800">Create User</h2>
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
                aria-label="Close"
              >
                &times;
              </button>
            </div>

            {createdCredentials ? (
              <div className="p-6 space-y-4">
                <div className="bg-green-50 text-green-800 px-4 py-3 rounded-md">
                  User created successfully.
                  {createdCredentials.apprenticeId && (
                    <span className="block mt-1 text-sm">
                      Apprentice profile #{createdCredentials.apprenticeId} is linked to this
                      account, but their registration is not complete yet.
                    </span>
                  )}
                  {createdCredentials.mentorId && (
                    <span className="block mt-1 text-sm">
                      Mentor profile #{createdCredentials.mentorId} is linked to this account.
                    </span>
                  )}
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded-md p-4">
                  <p className="text-sm text-gray-600">Username</p>
                  <p className="font-mono font-semibold text-gray-900">{createdCredentials.username}</p>
                  {createdCredentials.password && (
                    <>
                      <p className="text-sm text-gray-600 mt-3">Password (development — email not configured)</p>
                      <p className="font-mono font-semibold text-gray-900">{createdCredentials.password}</p>
                    </>
                  )}
                  {createdCredentials.credentialsSent && (
                    <p className="text-sm text-gray-500 mt-3">
                      A password has been emailed to the user.
                    </p>
                  )}
                </div>
                <div className="flex justify-end gap-3">
                  {createdCredentials.apprenticeId && (
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={newUser.full_name}
                    onChange={(e) => handleCreateChange('full_name', e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-brand"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                  <input
                    type="email"
                    required
                    value={newUser.email}
                    onChange={(e) => handleCreateChange('email', e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-brand"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Login credentials are emailed to this address.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Role *</label>
                  <select
                    value={newUser.role}
                    onChange={(e) => handleCreateChange('role', e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-4 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-brand"
                  >
                    <option value="Administrator">Administrator</option>
                    <option value="Supervisor">Supervisor</option>
                    <option value="Mentor">Mentor</option>
                    <option value="Apprentice">Apprentice</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    ID Number {newUser.role === 'Apprentice' && '*'}
                  </label>
                  <input
                    type="text"
                    required={newUser.role === 'Apprentice'}
                    value={newUser.id_number}
                    onChange={(e) => handleCreateChange('id_number', e.target.value.replace(/\D/g, '').slice(0, 13))}
                    className="w-full border border-gray-300 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-brand"
                  />
                  {newUser.role === 'Apprentice' && (
                    <p className="text-xs text-gray-500 mt-1">
                      13 digits. An apprentice record is created with this ID, or the
                      existing apprentice with this ID is linked to the new account.
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contact Number</label>
                  <input
                    type="text"
                    value={newUser.contact_number}
                    onChange={(e) => handleCreateChange('contact_number', e.target.value.replace(/\D/g, ''))}
                    className="w-full border border-gray-300 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-brand"
                  />
                </div>

                <p className="text-xs text-gray-500">
                  When no password is supplied, the system generates a secure
                  password from the user's credentials and emails the username
                  and password to them.
                </p>

                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowCreate(false)}
                    className="bg-gray-200 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-300"
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
          </div>
        </div>
      )}
    </div>
  );
}