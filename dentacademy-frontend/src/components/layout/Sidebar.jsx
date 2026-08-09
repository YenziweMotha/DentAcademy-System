import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

export default function Sidebar() {
  const { user } = useAuth();
  const location = useLocation();

  const getDashboardPath = () => {
    switch (user?.role) {
      case 'Administrator':
        return '/dashboard/admin';

      case 'Supervisor':
        return '/dashboard/supervisor';

      case 'Mentor':
        return '/dashboard/mentor';

      case 'Apprentice':
        return '/dashboard/apprentice';

      default:
        return '/';
    }
  };

  const navItems = [
    {
      name: 'Dashboard',
      path: getDashboardPath(),
    },
  ];

  // Administrator-only Users page
  if (user?.role === 'Administrator') {
    navItems.push({
      name: 'Users',
      path: '/dashboard/admin/users',
    });
  }

  // Reports are available to both Administrator and Supervisor
  if (
    user?.role === 'Administrator' ||
    user?.role === 'Supervisor'
  ) {
    navItems.push({
      name: 'Reports',
      path: '/dashboard/admin/reports',
    });
  }

  return (
    <aside className="w-64 bg-gray-800 min-h-screen text-white">
      <div className="p-6">
        <h1 className="text-xl font-bold">
          DentAcademy
        </h1>
      </div>

      <nav>
        {navItems.map((item) => (
          <Link
            key={item.name}
            to={item.path}
            className={`block px-6 py-3 transition-colors ${
              location.pathname === item.path
                ? 'bg-gray-700 text-white border-l-4 border-blue-500'
                : 'text-gray-300 hover:bg-gray-700 hover:text-white'
            }`}
          >
            {item.name}
          </Link>
        ))}
      </nav>
    </aside>
  );
}