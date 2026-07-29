import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import Login from './pages/Login'
import ProtectedRoute from './components/layout/ProtectedRoute'
import AdminDashboard from './pages/dashboards/AdminDashboard'
import SupervisorDashboard from './pages/dashboards/SupervisorDashboard'
import MentorDashboard from './pages/dashboards/MentorDashboard'
import ApprenticeDashboard from './pages/dashboards/ApprenticeDashboard'

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          
          <Route path="/dashboard/admin" element={
            <ProtectedRoute allowedRoles={['Admin']}>
              <AdminDashboard />
            </ProtectedRoute>
          } />
          <Route path="/dashboard/supervisor" element={
            <ProtectedRoute allowedRoles={['Supervisor']}>
              <SupervisorDashboard />
            </ProtectedRoute>
          } />
          <Route path="/dashboard/mentor" element={
            <ProtectedRoute allowedRoles={['Mentor']}>
              <MentorDashboard />
            </ProtectedRoute>
          } />
          <Route path="/dashboard/apprentice" element={
            <ProtectedRoute allowedRoles={['Apprentice']}>
              <ApprenticeDashboard />
            </ProtectedRoute>
          } />
          
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
