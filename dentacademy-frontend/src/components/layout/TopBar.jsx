import { useAuth } from '../../hooks/useAuth';
import Button from '../ui/Button';

export default function TopBar() {
  const { user, logout } = useAuth();

  return (
    <header className="h-16 bg-white shadow flex items-center justify-between px-6 z-10">
      <div className="text-lg font-semibold text-gray-800">
        Apprenticeship Portal
      </div>
      <div className="flex items-center space-x-4">
        <div className="text-sm">
          <span className="font-medium">{user?.full_name}</span>
          <span className="text-gray-500 ml-2">({user?.role})</span>
        </div>
        <Button variant="secondary" onClick={logout}>Logout</Button>
      </div>
    </header>
  );
}
