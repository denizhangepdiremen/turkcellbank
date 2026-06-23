import { Routes, Route, Navigate } from 'react-router-dom'
import { Login } from './pages/Login'
import { Register } from './pages/Register'
import { ForgotPassword } from './pages/ForgotPassword'
import { Dashboard } from './pages/Dashboard'
import { AdminPanel } from './pages/Admin'
import { BranchEmployeePanel } from './pages/BranchEmployee'
import { BranchManagerPanel } from './pages/BranchManager'
import { ProvincialManagerPanel } from './pages/ProvincialManager'
import { DirectorPanel } from './pages/Director'
import { NotFound } from './pages/NotFound'
import { ProtectedRoute } from './routes/ProtectedRoute'
import { GuestRoute } from './routes/GuestRoute'
import { Footer } from './components/Footer'

function App() {
  // Uygulamanın sayfa yönlendirmeleri. Footer her sayfanın altında görünür.
  return (
    <div className="app-shell">
      <Routes>
      <Route path="/login" element={<GuestRoute><Login /></GuestRoute>} />
      <Route path="/register" element={<GuestRoute><Register /></GuestRoute>} />
      <Route path="/forgot-password" element={<GuestRoute><ForgotPassword /></GuestRoute>} />
      {/* Müşteri panosu: sadece Customer rolü */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute requiredRole="Customer">
            <Dashboard />
          </ProtectedRoute>
        }
      />
      {/* Admin paneli: sadece Admin rolü (teknik admin) */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute requiredRole="Admin">
            <AdminPanel />
          </ProtectedRoute>
        }
      />
      {/* Personel panelleri: banka organizasyon hiyerarşisi */}
      <Route
        path="/sube"
        element={
          <ProtectedRoute requiredRole="BranchEmployee">
            <BranchEmployeePanel />
          </ProtectedRoute>
        }
      />
      <Route
        path="/sube-muduru"
        element={
          <ProtectedRoute requiredRole="BranchManager">
            <BranchManagerPanel />
          </ProtectedRoute>
        }
      />
      <Route
        path="/il-muduru"
        element={
          <ProtectedRoute requiredRole="ProvincialManager">
            <ProvincialManagerPanel />
          </ProtectedRoute>
        }
      />
      <Route
        path="/direktor"
        element={
          <ProtectedRoute requiredRole="Director">
            <DirectorPanel />
          </ProtectedRoute>
        }
      />
      {/* Ana adres açılınca login'e yönlendir */}
      <Route path="/" element={<Navigate to="/login" replace />} />
      {/* Tanımsız adresler -> 404 sayfası */}
      <Route path="*" element={<NotFound />} />
      </Routes>
      <Footer />
    </div>
  )
}

export default App
