import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import './index.css'
import App from './App.tsx'
import { AuthProvider } from './context/AuthContext'

// TanStack Query: API verisi çekme/önbellekleme yöneticisi (8c'de kullanılacak)
const queryClient = new QueryClient()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* BrowserRouter: URL bazlı yönlendirme */}
    <BrowserRouter>
      {/* QueryClientProvider: veri çekme altyapısı */}
      <QueryClientProvider client={queryClient}>
        {/* AuthProvider: oturum durumu (token/kullanıcı) */}
        <AuthProvider>
          <App />
          {/* Toast bildirimleri (başarı/hata) */}
          <Toaster position="top-right" toastOptions={{ duration: 3500 }} />
        </AuthProvider>
      </QueryClientProvider>
    </BrowserRouter>
  </StrictMode>,
)
