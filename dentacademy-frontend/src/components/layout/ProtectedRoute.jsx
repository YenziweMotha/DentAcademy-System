import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import Sidebar from './Sidebar';
import TopBar from './TopBar';

export default function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  console.log('ProtectedRoute:', {
    path: location.pathname,
    user,
    userRole: user?.role,
    allowedRoles,
    loading,
  });

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        Loading...
      </div>
    );
  }

  if (!user) {
    console.log('ProtectedRoute: No user → /login');

    return (
      <Navigate
        to="/login"
        state={{ from: location }}
        replace
      />
    );
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    console.log('ProtectedRoute: Role rejected', {
      userRole: user.role,
      allowedRoles,
    });

    return <Navigate to="/login" replace />;
  }

  console.log('ProtectedRoute: Access granted');

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar />

      <div className="flex flex-col flex-1 overflow-hidden">
        <TopBar />

        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}