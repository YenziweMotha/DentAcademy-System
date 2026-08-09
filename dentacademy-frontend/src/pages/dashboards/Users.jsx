import { useEffect, useState } from 'react';
import api from '../../api/axios';

export default function Users() {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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

      await loadUsers();
    } catch (err) {
      console.error('Failed to update user:', err);

      alert(
        err.response?.data?.detail ||
        'Failed to update user status.'
      );
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

        <button
          type="button"
          onClick={loadUsers}
          className="mt-4 md:mt-0 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
        >
          Refresh
        </button>
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
              className="w-full border border-gray-300 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Filter by role
            </label>

            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-4 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
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
            Loading users...
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
    </div>
  );
}