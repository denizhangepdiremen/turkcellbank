import { apiClient } from '../lib/apiClient'
import type { ApiResponse, AuthResponse, User } from '../lib/types'

export interface RegisterPayload {
  fullName: string
  email: string
  password: string
}

export interface LoginPayload {
  email: string
  password: string
}

// Kayıt: yeni kullanıcı oluşturur.
export async function register(payload: RegisterPayload) {
  const { data } = await apiClient.post<ApiResponse<User>>(
    '/api/auth/register',
    payload,
  )
  return data
}

// Giriş: token + kullanıcı döner.
export async function login(payload: LoginPayload) {
  const { data } = await apiClient.post<ApiResponse<AuthResponse>>(
    '/api/auth/login',
    payload,
  )
  return data
}

// Giriş yapan kullanıcının bilgisi (token gerektirir).
export async function getMe() {
  const { data } = await apiClient.get<ApiResponse<User>>('/api/auth/me')
  return data
}
