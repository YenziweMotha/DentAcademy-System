import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

export default function Sidebar() {
  const { user } = useAuth();
  const location = useLocation();

  const getDashboardPath = () => {
    switch (user?.role) {
      case 'Administrator': return '/dashboard/admin';
      case 'Supervisor': return '/dashboard/supervisor';
      case 'Mentor': return '/dashboard/mentor';
      case 'Apprentice': return '/dashboard/apprentice';
      default: return '/';
    }
  };

  const navItems = [
    { name: 'Dashboard', path: getDashboardPath() },
  ];

  if (user?.role === 'Administrator') {
    navItems.push({ name: 'Users', path: '/users' });
    navItems.push({ name: 'Reports', path: '/reports' });
  }

  return (
    <div className="w-64 bg-gray-800 text-white flex flex-col">
      <div className="h-16 flex items-center justify-center border-b border-gray-700">
        <h1 className="text-xl font-bold text-blue-400">DentAcademy</h1>
      </div>
      <nav className="flex-1 overflow-y-auto py-4">
        <ul className="space-y-1">
          {navItems.map((item) => (
            <li key={item.path}>
              <Link
                to={item.path}
                className={`block px-6 py-2 transition-colors ${location.pathname === item.path ? 'bg-gray-700 text-white border-l-4 border-blue-500' : 'text-gray-300 hover:bg-gray-700 hover:text-white'}`}
              >
                {item.name}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
