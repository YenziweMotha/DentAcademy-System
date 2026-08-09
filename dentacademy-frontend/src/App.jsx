import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';

import Login from './pages/Login';
import ProtectedRoute from './components/layout/ProtectedRoute';

import AdminDashboard from './pages/dashboards/AdminDashboard';
import SupervisorDashboard from './pages/dashboards/SupervisorDashboard';
import MentorDashboard from './pages/dashboards/MentorDashboard';
import ApprenticeDashboard from './pages/dashboards/ApprenticeDashboard';

import Performance from './pages/dashboards/Performance';
import Users from './pages/dashboards/Users';
import Reports from './pages/dashboards/Reports';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>

          {/* Login */}
          <Route
            path="/login"
            element={<Login />}
          />

          {/* ================= ADMIN ================= */}

          <Route
            path="/dashboard/admin"
            element={
              <ProtectedRoute allowedRoles={['Administrator']}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />

          {/* Admin Users */}
          <Route
            path="/dashboard/admin/users"
            element={
              <ProtectedRoute allowedRoles={['Administrator']}>
                <Users />
              </ProtectedRoute>
            }
          />

          {/* ================= REPORTS ================= */}

          <Route
            path="/dashboard/admin/reports"
            element={
              <ProtectedRoute
                allowedRoles={['Administrator', 'Supervisor']}
              >
                <Reports />
              </ProtectedRoute>
            }
          />

          {/* ================= SUPERVISOR ================= */}

          <Route
            path="/dashboard/supervisor"
            element={
              <ProtectedRoute allowedRoles={['Supervisor']}>
                <SupervisorDashboard />
              </ProtectedRoute>
            }
          />

          {/* ================= MENTOR ================= */}

          <Route
            path="/dashboard/mentor"
            element={
              <ProtectedRoute allowedRoles={['Mentor']}>
                <MentorDashboard />
              </ProtectedRoute>
            }
          />

          {/* ================= APPRENTICE ================= */}

          <Route
            path="/dashboard/apprentice"
            element={
              <ProtectedRoute allowedRoles={['Apprentice']}>
                <ApprenticeDashboard />
              </ProtectedRoute>
            }
          />

          {/* ================= PERFORMANCE ================= */}

          <Route
            path="/dashboard/performance/:apprenticeId"
            element={
              <ProtectedRoute
                allowedRoles={['Administrator', 'Supervisor']}
              >
                <Performance />
              </ProtectedRoute>
            }
          />

          {/* ================= DEFAULT ================= */}

          <Route
            path="/"
            element={<Navigate to="/login" replace />}
          />

          {/* Unknown route */}
          <Route
            path="*"
            element={<Navigate to="/login" replace />}
          />

        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;