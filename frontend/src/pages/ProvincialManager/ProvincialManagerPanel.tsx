import { usePageTitle } from '../../lib/usePageTitle'
import { StaffShell, ComingSoon } from '../staff/StaffShell'

/**
 * İl müdürü paneli. Kendi ilindeki şube müdürlerini ve şube datalarını görür;
 * 50M–100M arası krediler onayına gelir (Sprint 2 ve 4).
 */
export function ProvincialManagerPanel() {
  usePageTitle('İl Müdürü')
  return (
    <StaffShell
      title="İl Müdürü Paneli"
      subtitle="İlinizdeki şubeleri ve onayınıza düşen kredileri yönetin."
    >
      <ComingSoon
        lead="Bu panelden ilinizdeki şubeleri denetleyecek ve büyük kredileri onaylayacaksınız."
        upcoming={[
          'Kredi onay kuyruğu (50M – 100M TL bandı)',
          'İlinizdeki şube müdürleri ve şubelerin görünümü',
          'İl geneli kredi ve performans raporları',
        ]}
      />
    </StaffShell>
  )
}
