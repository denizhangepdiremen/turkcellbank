import { Routes, Route, Navigate } from 'react-router-dom'
import { Login } from './pages/Login'
import { Register } from './pages/Register'

function App() {
  // Uygulamanın sayfa yönlendirmeleri.
  // Backend aşamasında buraya korumalı sayfalar (dashboard vb.) eklenecek.
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      {/* Ana adres açılınca login'e yönlendir */}
      <Route path="/" element={<Navigate to="/login" replace />} />
      {/* Tanımsız adresler de login'e gitsin */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}

export default App
