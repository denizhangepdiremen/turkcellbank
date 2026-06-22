import { Routes, Route, Navigate } from 'react-router-dom'
import { Login } from './pages/Login'
import { Register } from './pages/Register'
import { ForgotPassword } from './pages/ForgotPassword'
import { Dashboard } from './pages/Dashboard'
import { AdminPanel } from './pages/Admin'
import { NotFound } from './pages/NotFound'
import { ProtectedRoute } from './routes/ProtectedRoute'
import { GuestRoute } from './routes/GuestRoute'

function App() {
  // Uygulamanın sayfa yönlendirmeleri.
  return (
    <Routes>
      <Route path="/login" element={<GuestRoute><Login /></GuestRoute>} />
      <Route path="/register" element={<GuestRoute><Register /></GuestRoute>} />
      <Route path="/forgot-password" element={<GuestRoute><ForgotPassword /></GuestRoute>} />
      {/* Dashboard korumalı: token yoksa login'e yönlenir */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      {/* Admin paneli: sadece Admin rolü */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute requiredRole="Admin">
            <AdminPanel />
          </ProtectedRoute>
        }
      />
      {/* Ana adres açılınca login'e yönlendir */}
      <Route path="/" element={<Navigate to="/login" replace />} />
      {/* Tanımsız adresler -> 404 sayfası */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}

export default App
