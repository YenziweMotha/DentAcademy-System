import { LogOut } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../context/ToastContext';
import Button from '../ui/Button';

export default function TopBar() {
  const { user, logout } = useAuth();
  const toast = useToast();

  const handleLogout = async () => {
    await logout();
    toast.success('You have been signed out.');
  };

  const initials = (user?.full_name || user?.username || '?')
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <header className="h-16 bg-white shadow-sm flex items-center justify-between px-6 z-10 border-b border-slate-200">
      <div className="text-lg font-semibold text-gray-800">
        Apprenticeship Portal
      </div>
      <div className="flex items-center space-x-4">
        <div className="hidden sm:flex items-center gap-3 text-right">
          <div>
            <p className="text-sm font-medium leading-tight">{user?.full_name || user?.username}</p>
            <p className="text-xs text-gray-500">{user?.role}</p>
          </div>
        </div>
        <div className="h-9 w-9 rounded-full bg-brand text-white flex items-center justify-center text-sm font-bold">
          {initials}
        </div>
        <Button variant="secondary" onClick={handleLogout}>
          <span className="inline-flex items-center gap-2">
            <LogOut size={15} /> Logout
          </span>
        </Button>
      </div>
    </header>
  );
}
