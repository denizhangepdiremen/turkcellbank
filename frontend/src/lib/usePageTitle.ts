import { useEffect } from 'react'

/** Sayfa başlığını (tarayıcı sekmesi) ayarlar. */
export function usePageTitle(title: string) {
  useEffect(() => {
    document.title = `${title} · TurkcellBank`
  }, [title])
}
