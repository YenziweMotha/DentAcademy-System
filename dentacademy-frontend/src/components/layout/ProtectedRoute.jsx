import { useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import Spinner from '../ui/Spinner';
import PageTransition from '../ui/PageTransition';

const TITLE_MAP = [
  { match: '/dashboard/admin/users', title: 'Users' },
  { match: '/dashboard/admin/settings', title: 'Settings' },
  { match: '/dashboard/admin/logs', title: 'Audit Logs' },
  { match: '/dashboard/admin/reports', title: 'Reports' },
  { match: '/dashboard/admin', title: 'Admin Dashboard' },
  { match: '/dashboard/supervisor', title: 'Supervisor Dashboard' },
  { match: '/dashboard/mentor', title: 'Mentor Dashboard' },
  { match: '/dashboard/apprentice', title: 'My Dashboard' },
  { match: '/dashboard/performance', title: 'Performance' },
  { match: '/experience-chat', title: 'AI Experience Assistant' },
  { match: '/escalations', title: 'Experience Escalations' },
  { match: '/apprentices', title: 'Apprentices' },
  { match: '/modules/progress', title: 'Module Progress' },
  { match: '/modules', title: 'Modules' },
  { match: '/evaluations/submit', title: 'Submit Evaluation' },
  { match: '/evaluations/approve', title: 'Approve Evaluations' },
  { match: '/evaluations', title: 'Evaluations' },
  { match: '/predictions', title: 'AI Predictions' },
  { match: '/mentors', title: 'Mentors' },
  { match: '/attendance', title: 'Attendance' },
];

function resolveTitle(pathname) {
  const found = TITLE_MAP.find((t) => pathname.startsWith(t.match));
  return found?.title || 'Portal';
}

export default function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-surface">
        <div className="flex flex-col items-center gap-3 animate-fade-up">
          <Spinner size="lg" className="text-brand" />
          <p className="text-sm text-ink-muted">Loading your workspace…</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="flex h-screen bg-surface overflow-hidden">
      <Sidebar mobileOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-[1px] z-30 lg:hidden animate-fade-in"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      <div className="flex flex-col flex-1 overflow-hidden min-w-0">
        <TopBar
          onMenuClick={() => setSidebarOpen(true)}
          pageTitle={resolveTitle(location.pathname)}
        />

        <main className="flex-1 overflow-y-auto">
          <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto w-full">
            <PageTransition>{children}</PageTransition>
          </div>
        </main>
      </div>
    </div>
  );
}
