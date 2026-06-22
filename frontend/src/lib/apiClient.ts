import axios from 'axios'

// Token'ı localStorage'da bu anahtarla saklıyoruz.
export const TOKEN_KEY = 'turkcellbank_token'

// Merkezi axios istemcisi. baseURL .env'den (VITE_API_URL) gelir.
export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:5099',
  headers: { 'Content-Type': 'application/json' },
})

// İstek interceptor: token varsa her isteğe otomatik Authorization başlığı ekle.
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY)
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Cevap interceptor: 401 (yetkisiz) gelirse token'ı temizle ve login'e yönlendir.
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem(TOKEN_KEY)
      if (window.location.pathname !== '/login') {
        window.location.replace('/login')
      }
    }
    return Promise.reject(error)
  },
)
