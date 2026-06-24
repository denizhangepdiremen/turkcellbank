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
          {/* Toast bildirimleri (başarı/hata) — marka renkleri */}
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 3500,
              style: {
                borderRadius: '12px',
                padding: '14px 18px',
                fontSize: '0.9rem',
                fontWeight: 500,
                boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
              },
              success: {
                style: {
                  background: '#eef2ff',
                  color: '#3730a3',
                  border: '1px solid #c7d2fe',
                },
                iconTheme: { primary: '#4f46e5', secondary: '#eef2ff' },
              },
              error: {
                style: {
                  background: '#fef2f2',
                  color: '#991b1b',
                  border: '1px solid #fecaca',
                },
                iconTheme: { primary: '#dc2626', secondary: '#fef2f2' },
              },
            }}
          />
        </AuthProvider>
      </QueryClientProvider>
    </BrowserRouter>
  </StrictMode>,
)
