// Rol bazlı yetkilendirme yardımcıları (backend UserRole enum'unun karşılığı).
// Tek kaynak: rol → Türkçe etiket ve rol → ana panel yolu eşlemeleri burada.

export type UserRole =
  | 'Customer'
  | 'BranchEmployee'
  | 'BranchManager'
  | 'ProvincialManager'
  | 'Director'
  | 'Admin'

// Rolün kullanıcıya gösterilecek Türkçe etiketi.
const ROLE_LABELS: Record<string, string> = {
  Customer: 'Müşteri',
  BranchEmployee: 'Şube Çalışanı',
  BranchManager: 'Şube Müdürü',
  ProvincialManager: 'İl Müdürü',
  Director: 'Direktör',
  Admin: 'Sistem Admini',
}

export const roleLabel = (role?: string | null) =>
  (role && ROLE_LABELS[role]) || role || ''

// Her rolün giriş sonrası yönlendirileceği ana panel yolu.
const ROLE_HOME: Record<string, string> = {
  Customer: '/dashboard',
  BranchEmployee: '/sube',
  BranchManager: '/sube-muduru',
  ProvincialManager: '/il-muduru',
  Director: '/direktor',
  Admin: '/admin',
}

/** Rolün ana paneli; bilinmeyen/boş rolde login'e düşer. */
export const roleHomePath = (role?: string | null) =>
  (role && ROLE_HOME[role]) || '/login'
