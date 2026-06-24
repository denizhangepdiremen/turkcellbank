// Kart numarasını 4'erli gruplara ayırır: "1234567890123456" -> "1234 5678 9012 3456"
export function formatCardNumber(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 16)
  return digits.replace(/(.{4})(?=.)/g, '$1 ')
}

// IBAN'ı 4'lü gruplara ayırır: "TR1234567890123456789012" -> "TR12 3456 7890 1234 5678 9012"
export function formatIban(iban: string) {
  return iban.replace(/(.{4})(?=.)/g, '$1 ')
}

// Sadece rakam bırakır (CVV, tutar vb. için)
export function digitsOnly(value: string, maxLength?: number) {
  const d = value.replace(/\D/g, '')
  return maxLength ? d.slice(0, maxLength) : d
}
