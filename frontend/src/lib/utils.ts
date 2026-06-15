import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * cn = "class names" birleştirici (shadcn/ui standart yardımcı fonksiyonu).
 *
 * - clsx   : koşullu class'ları ("aktifse şu class") tek string'de toplar.
 * - twMerge: çakışan Tailwind class'larını akıllıca çözer.
 *            Örn. cn("p-2", "p-4") => "p-4" (son yazan kazanır, çakışma olmaz).
 *
 * Komponentlerde hem varsayılan stilleri hem dışarıdan gelen className'i
 * çakışmadan birleştirmek için kullanılır.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
