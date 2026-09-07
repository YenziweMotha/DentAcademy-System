import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  BrainCircuit,
  CalendarCheck,
  ClipboardCheck,
  FileText,
  BookOpen,
  UserCheck,
  BadgeCheck,
  UserCog,
  Settings,
  ScrollText,
  PenLine,
  GraduationCap,
  MessageSquare,
  ShieldAlert,
  X,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import Logo from '../ui/Logo';

export default function Sidebar({ mobileOpen = false, onClose }) {
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

  const groups = [];
  const overview = [{ name: 'Dashboard', path: getDashboardPath(), icon: LayoutDashboard }];

  if (user?.role === 'Apprentice') {
    overview.push({
      name: 'Experience Chat',
      path: '/experience-chat',
      icon: MessageSquare,
    });
  }

  const management = [];
  if (user?.role === 'Administrator' || user?.role === 'Supervisor') {
    management.push(
      { name: 'Apprentices', path: '/apprentices', icon: Users },
      { name: 'Module Progress', path: '/modules/progress', icon: GraduationCap },
      { name: 'AI Predictions', path: '/predictions', icon: BrainCircuit },
      { name: 'Attendance', path: '/attendance', icon: CalendarCheck },
      { name: 'Evaluations', path: '/evaluations', icon: ClipboardCheck },
      { name: 'Reports', path: '/dashboard/admin/reports', icon: FileText },
      { name: 'Escalations', path: '/escalations', icon: ShieldAlert }
    );
  }

  if (user?.role === 'Mentor') {
    management.push(
      { name: 'My Evaluations', path: '/evaluations', icon: ClipboardCheck },
      { name: 'Submit Evaluation', path: '/evaluations/submit', icon: PenLine }
    );
  }

  const administration = [];
  if (user?.role === 'Administrator') {
    administration.push(
      { name: 'Modules', path: '/modules', icon: BookOpen },
      { name: 'Mentors', path: '/mentors', icon: UserCheck },
      { name: 'Approve Evaluations', path: '/evaluations/approve', icon: BadgeCheck },
      { name: 'Users', path: '/dashboard/admin/users', icon: UserCog },
      { name: 'Audit Logs', path: '/dashboard/admin/logs', icon: ScrollText },
      { name: 'Settings', path: '/dashboard/admin/settings', icon: Settings }
    );
  }

  if (user?.role === 'Supervisor') {
    administration.push({
      name: 'Approve Evaluations',
      path: '/evaluations/approve',
      icon: BadgeCheck,
    });
  }

  if (overview.length) groups.push({ label: 'Overview', items: overview });
  if (management.length) groups.push({ label: 'Management', items: management });
  if (administration.length) groups.push({ label: 'Administration', items: administration });

  const closeOnClick = () => {
    if (onClose) onClose();
  };

  const isActive = (path) => {
    if (path === getDashboardPath()) {
      return location.pathname === path;
    }
    return location.pathname === path || location.pathname.startsWith(`${path}/`);
  };

  return (
    <aside
      className={`fixed lg:static inset-y-0 left-0 z-40 w-[17rem] bg-[#07111F] min-h-screen text-white flex flex-col shrink-0 transform transition-transform duration-250 ease-out ${
        mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      }`}
    >
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-20 -left-16 h-56 w-56 rounded-full bg-brand/30 blur-3xl" />
        <div className="absolute bottom-10 -right-20 h-64 w-64 rounded-full bg-accent/20 blur-3xl" />
      </div>

      <div className="relative p-5 flex items-center justify-between border-b border-white/10">
        <div className="flex items-center gap-3">
          <Logo size={36} light />
          <div>
            <h1 className="text-lg font-extrabold leading-tight tracking-tight">DentAcademy</h1>
            <p className="text-blue-200/70 text-[11px] leading-tight font-medium tracking-wide">
              Apprenticeship Portal
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={closeOnClick}
          className="lg:hidden text-blue-100/80 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors"
          aria-label="Close navigation"
        >
          <X size={20} />
        </button>
      </div>

      <nav className="relative flex-1 overflow-y-auto px-3 py-5 space-y-6">
        {groups.map((group) => (
          <div key={group.label}>
            <p className="px-3 mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-blue-200/45">
              {group.label}
            </p>
            <div className="space-y-1">
              {group.items.map((item) => {
                const active = isActive(item.path);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    to={item.path}
                    onClick={closeOnClick}
                    className={`group flex items-center gap-3 px-3 py-2.5 rounded-2xl text-sm font-semibold transition-all duration-180 ${
                      active
                        ? 'bg-brand text-white shadow-[0_8px_24px_rgb(11_95_255_/_0.35)]'
                        : 'text-blue-100/75 hover:bg-white/[0.07] hover:text-white'
                    }`}
                  >
                    <span
                      className={`flex h-8 w-8 items-center justify-center rounded-xl transition-colors ${
                        active
                          ? 'bg-white/20 text-white'
                          : 'bg-white/5 text-blue-200/80 group-hover:bg-white/10'
                      }`}
                    >
                      <Icon size={16} />
                    </span>
                    {item.name}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="relative p-4 border-t border-white/10">
        <div className="rounded-2xl bg-white/5 px-3 py-2.5 text-[11px] text-blue-100/60 ring-1 ring-white/10">
          Signed in as{' '}
          <span className="text-white font-semibold">{user?.role}</span>
        </div>
      </div>
    </aside>
  );
}
