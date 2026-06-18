// Kart numarasını 4'erli gruplara ayırır: "1234567890123456" -> "1234 5678 9012 3456"
export function formatCardNumber(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 16)
  return digits.replace(/(.{4})(?=.)/g, '$1 ')
}

// Sadece rakam bırakır (CVV, tutar vb. için)
export function digitsOnly(value: string, maxLength?: number) {
  const d = value.replace(/\D/g, '')
  return maxLength ? d.slice(0, maxLength) : d
}
