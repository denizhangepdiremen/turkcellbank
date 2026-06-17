import { Routes, Route, Navigate } from 'react-router-dom'
import { Login } from './pages/Login'
import { Register } from './pages/Register'
import { ForgotPassword } from './pages/ForgotPassword'
import { Dashboard } from './pages/Dashboard'
import { ProtectedRoute } from './routes/ProtectedRoute'

function App() {
  // Uygulamanın sayfa yönlendirmeleri.
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      {/* Dashboard korumalı: token yoksa login'e yönlenir */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      {/* Ana adres açılınca login'e yönlendir */}
      <Route path="/" element={<Navigate to="/login" replace />} />
      {/* Tanımsız adresler de login'e gitsin */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}

export default App
