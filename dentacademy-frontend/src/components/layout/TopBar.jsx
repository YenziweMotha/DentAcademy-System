import { useState, useRef, useEffect } from 'react';
import { LogOut, Menu, ChevronDown } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../context/ToastContext';
import Button from '../ui/Button';
import Avatar from '../ui/Avatar';

export default function TopBar({ onMenuClick, pageTitle }) {
  const { user, logout } = useAuth();
  const toast = useToast();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const onClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const handleLogout = async () => {
    await logout();
    toast.success('You have been signed out.');
  };

  return (
    <header className="h-16 bg-white/80 backdrop-blur-xl flex items-center justify-between px-4 sm:px-6 z-20 border-b border-line shrink-0">
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onMenuClick}
          className="lg:hidden p-2 -ml-2 rounded-xl text-ink-muted hover:bg-brand-light hover:text-brand transition-colors focus-ring"
          aria-label="Open navigation"
        >
          <Menu size={22} />
        </button>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brand hidden sm:block">
            DentAcademy
          </p>
          <h1 className="text-sm sm:text-base font-bold text-ink truncate tracking-tight">
            {pageTitle || 'Apprenticeship Portal'}
          </h1>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            className="flex items-center gap-2 sm:gap-3 rounded-2xl px-2 py-1.5 hover:bg-surface-muted transition-colors focus-ring"
            aria-expanded={menuOpen}
            aria-haspopup="menu"
          >
            <div className="hidden sm:block text-right">
              <p className="text-sm font-semibold leading-tight text-ink">
                {user?.full_name || user?.username}
              </p>
              <p className="text-xs text-ink-subtle">{user?.role}</p>
            </div>
            <Avatar name={user?.full_name || user?.username} size="sm" />
            <ChevronDown
              size={14}
              className={`text-ink-subtle hidden sm:block transition-transform duration-180 ${
                menuOpen ? 'rotate-180' : ''
              }`}
            />
          </button>

          {menuOpen && (
            <div
              role="menu"
              className="absolute right-0 mt-2 w-52 card-surface p-1.5 shadow-lift animate-scale-in origin-top-right z-50"
            >
              <div className="px-3 py-2 border-b border-line mb-1 sm:hidden">
                <p className="text-sm font-semibold text-ink">
                  {user?.full_name || user?.username}
                </p>
                <p className="text-xs text-ink-subtle">{user?.role}</p>
              </div>
              <button
                type="button"
                role="menuitem"
                onClick={handleLogout}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-rose-600 hover:bg-rose-50 transition-colors font-medium"
              >
                <LogOut size={15} />
                Sign out
              </button>
            </div>
          )}
        </div>

        <Button
          variant="ghost"
          size="sm"
          className="!px-2 sm:hidden"
          onClick={handleLogout}
          aria-label="Sign out"
        >
          <LogOut size={16} />
        </Button>
      </div>
    </header>
  );
}
