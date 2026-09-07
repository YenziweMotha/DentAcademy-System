import { LogOut, Menu } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../context/ToastContext';
import Button from '../ui/Button';

export default function TopBar({ onMenuClick }) {
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
    <header className="h-16 bg-white shadow-sm flex items-center justify-between px-4 sm:px-6 z-20 border-b border-slate-200 shrink-0">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onMenuClick}
          className="lg:hidden p-2 -ml-2 rounded-md text-gray-600 hover:bg-gray-100"
          aria-label="Open navigation"
        >
          <Menu size={22} />
        </button>
        <div className="text-lg font-semibold text-gray-800">
          Apprenticeship Portal
        </div>
      </div>
      <div className="flex items-center space-x-3 sm:space-x-4">
        <div className="hidden sm:flex items-center gap-3 text-right">
          <div>
            <p className="text-sm font-medium leading-tight">{user?.full_name || user?.username}</p>
            <p className="text-xs text-gray-500">{user?.role}</p>
          </div>
        </div>
        <div className="h-9 w-9 rounded-full bg-brand text-white flex items-center justify-center text-sm font-bold">
          {initials}
        </div>
        <Button variant="secondary" onClick={handleLogout} className="!px-3 sm:!px-4">
          <span className="inline-flex items-center gap-2">
            <LogOut size={15} /> <span className="hidden sm:inline">Logout</span>
          </span>
        </Button>
      </div>
    </header>
  );
}
