import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';

import Login from './pages/Login';
import ForgotPassword from './pages/auth/ForgotPassword';
import ResetPassword from './pages/auth/ResetPassword';
import ProtectedRoute from './components/layout/ProtectedRoute';

import AdminDashboard from './pages/dashboards/AdminDashboard';
import SupervisorDashboard from './pages/dashboards/SupervisorDashboard';
import MentorDashboard from './pages/dashboards/MentorDashboard';
import ApprenticeDashboard from './pages/dashboards/ApprenticeDashboard';

import Performance from './pages/dashboards/Performance';
import Users from './pages/dashboards/Users';
import Reports from './pages/dashboards/Reports';
import SystemSettings from './pages/dashboards/SystemSettings';

import ApprenticeList from './pages/apprentices/ApprenticeList';
import ApprenticeCreate from './pages/apprentices/ApprenticeCreate';
import ApprenticeDetail from './pages/apprentices/ApprenticeDetail';
import ApprenticeEdit from './pages/apprentices/ApprenticeEdit';

import ModuleManage from './pages/modules/ModuleManage';
import ModuleProgress from './pages/modules/ModuleProgress';

import EvaluationList from './pages/evaluations/EvaluationList';
import EvaluationSubmit from './pages/evaluations/EvaluationSubmit';
import EvaluationApprove from './pages/evaluations/EvaluationApprove';

import PredictionView from './pages/predictions/PredictionView';
import Mentors from './pages/mentors/Mentors';
import AttendancePage from './pages/attendance/AttendancePage';

const staff = ['Administrator', 'Supervisor'];

function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>

          {/* Login & auth */}
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          {/* ================= ADMIN ================= */}

          <Route
            path="/dashboard/admin"
            element={
              <ProtectedRoute allowedRoles={['Administrator']}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/dashboard/admin/users"
            element={
              <ProtectedRoute allowedRoles={['Administrator']}>
                <Users />
              </ProtectedRoute>
            }
          />

          <Route
            path="/dashboard/admin/settings"
            element={
              <ProtectedRoute allowedRoles={['Administrator']}>
                <SystemSettings />
              </ProtectedRoute>
            }
          />

          {/* ================= REPORTS ================= */}

          <Route
            path="/dashboard/admin/reports"
            element={
              <ProtectedRoute allowedRoles={staff}>
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

          {/* ================= APPRENTICES ================= */}

          <Route
            path="/apprentices"
            element={
              <ProtectedRoute allowedRoles={staff}>
                <ApprenticeList />
              </ProtectedRoute>
            }
          />

          <Route
            path="/apprentices/create"
            element={
              <ProtectedRoute allowedRoles={staff}>
                <ApprenticeCreate />
              </ProtectedRoute>
            }
          />

          <Route
            path="/apprentices/:apprenticeId"
            element={
              <ProtectedRoute allowedRoles={staff}>
                <ApprenticeDetail />
              </ProtectedRoute>
            }
          />

          <Route
            path="/apprentices/:apprenticeId/edit"
            element={
              <ProtectedRoute allowedRoles={staff}>
                <ApprenticeEdit />
              </ProtectedRoute>
            }
          />

          {/* ================= MODULES ================= */}

          <Route
            path="/modules"
            element={
              <ProtectedRoute allowedRoles={['Administrator']}>
                <ModuleManage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/modules/progress"
            element={
              <ProtectedRoute allowedRoles={staff}>
                <ModuleProgress />
              </ProtectedRoute>
            }
          />

          {/* ================= EVALUATIONS ================= */}

          <Route
            path="/evaluations"
            element={
              <ProtectedRoute allowedRoles={['Administrator', 'Supervisor', 'Mentor']}>
                <EvaluationList />
              </ProtectedRoute>
            }
          />

          <Route
            path="/evaluations/submit"
            element={
              <ProtectedRoute allowedRoles={['Mentor']}>
                <EvaluationSubmit />
              </ProtectedRoute>
            }
          />

          <Route
            path="/evaluations/approve"
            element={
              <ProtectedRoute allowedRoles={staff}>
                <EvaluationApprove />
              </ProtectedRoute>
            }
          />

          {/* ================= PREDICTIONS ================= */}

          <Route
            path="/predictions"
            element={
              <ProtectedRoute allowedRoles={staff}>
                <PredictionView />
              </ProtectedRoute>
            }
          />

          {/* ================= MENTORS ================= */}

          <Route
            path="/mentors"
            element={
              <ProtectedRoute allowedRoles={['Administrator']}>
                <Mentors />
              </ProtectedRoute>
            }
          />

          {/* ================= ATTENDANCE ================= */}

          <Route
            path="/attendance"
            element={
              <ProtectedRoute allowedRoles={staff}>
                <AttendancePage />
              </ProtectedRoute>
            }
          />

          {/* ================= PERFORMANCE ================= */}

          <Route
            path="/dashboard/performance/:apprenticeId"
            element={
              <ProtectedRoute allowedRoles={staff}>
                <Performance />
              </ProtectedRoute>
            }
          />

          {/* ================= DEFAULT ================= */}

          <Route path="/" element={<Navigate to="/login" replace />} />

          <Route path="*" element={<Navigate to="/login" replace />} />

        </Routes>
      </BrowserRouter>
    </AuthProvider>
    </ToastProvider>
  );
}

export default App;