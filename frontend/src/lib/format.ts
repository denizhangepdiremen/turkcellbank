// Kart numarasını 4'erli gruplara ayırır: "1234567890123456" -> "1234 5678 9012 3456"
export function formatCardNumber(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 16)
  return digits.replace(/(.{4})(?=.)/g, '$1 ')
}

// IBAN'ı boşluksuz, büyük harfli forma çevirir.
export function normalizeIban(iban: string) {
  return iban.replace(/\s/g, '').toUpperCase()
}

// IBAN'ı 4'lü gruplara ayırır: "TR123456789012345678901234" -> "TR12 3456 7890 1234 5678 9012 34"
export function formatIban(iban: string) {
  return normalizeIban(iban).replace(/(.{4})(?=.)/g, '$1 ')
}

// Transfer formunda kullanıcı yazarken TR prefix'i ekler ve 4'lü gruplar.
export function formatIbanInput(value: string) {
  const compact = normalizeIban(value)
  const digits = compact.startsWith('TR')
    ? compact.slice(2).replace(/\D/g, '')
    : compact.replace(/\D/g, '')
  const iban = digits ? `TR${digits.slice(0, 24)}` : ''
  return formatIban(iban)
}

// Sadece rakam bırakır (CVV, tutar vb. için)
export function digitsOnly(value: string, maxLength?: number) {
  const d = value.replace(/\D/g, '')
  return maxLength ? d.slice(0, maxLength) : d
}
