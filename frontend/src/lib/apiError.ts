import { AxiosError } from 'axios'
import type { ApiResponse } from './types'

/**
 * Axios hatasından backend'in Response Wrapper mesajını çıkarır.
 * errors listesi varsa onları, yoksa message'ı, o da yoksa fallback'i döner.
 */
export function getApiErrorMessage(
  error: unknown,
  fallback = 'Bir hata oluştu.',
): string {
  if (error instanceof AxiosError) {
    const data = error.response?.data as ApiResponse<unknown> | undefined
    if (data?.errors && data.errors.length > 0) return data.errors.join(' ')
    if (data?.message) return data.message
  }
  return fallback
}
