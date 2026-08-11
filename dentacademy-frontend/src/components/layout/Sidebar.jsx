import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  ClipboardList,
  BrainCircuit,
  CalendarCheck,
  ClipboardCheck,
  FileText,
  BookOpen,
  UserCheck,
  BadgeCheck,
  UserCog,
  Settings,
  PenLine,
  GraduationCap,
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

  const management = [];
  if (user?.role === 'Administrator' || user?.role === 'Supervisor') {
    management.push(
      { name: 'Apprentices', path: '/apprentices', icon: Users },
      { name: 'Module Progress', path: '/modules/progress', icon: GraduationCap },
      { name: 'AI Predictions', path: '/predictions', icon: BrainCircuit },
      { name: 'Attendance', path: '/attendance', icon: CalendarCheck },
      { name: 'Evaluations', path: '/evaluations', icon: ClipboardCheck },
      { name: 'Reports', path: '/dashboard/admin/reports', icon: FileText }
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

  return (
    <aside
      className={`fixed lg:static inset-y-0 left-0 z-40 w-64 bg-gradient-to-b from-brand-dark to-[#0E3A1C] min-h-screen text-white flex flex-col shrink-0 transform transition-transform duration-200 ease-in-out ${
        mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      }`}
    >
      <div className="p-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Logo size={36} light />
          <div>
            <h1 className="text-lg font-bold leading-tight">DentAcademy</h1>
            <p className="text-emerald-300/70 text-[11px] leading-tight">
              Apprenticeship Portal
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={closeOnClick}
          className="lg:hidden text-emerald-100/80 hover:text-white p-1 rounded-md hover:bg-white/10"
          aria-label="Close navigation"
        >
          <X size={20} />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 pb-6 space-y-6">
        {groups.map((group) => (
          <div key={group.label}>
            <p className="px-3 mb-2 text-[11px] font-semibold uppercase tracking-wider text-emerald-300/60">
              {group.label}
            </p>
            <div className="space-y-1">
              {group.items.map((item) => {
                const active =
                  location.pathname === item.path;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    to={item.path}
                    onClick={closeOnClick}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                      active
                        ? 'bg-brand text-white shadow-md'
                        : 'text-emerald-100/80 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <Icon size={18} className={active ? '' : 'text-emerald-300/70'} />
                    {item.name}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  );
}
