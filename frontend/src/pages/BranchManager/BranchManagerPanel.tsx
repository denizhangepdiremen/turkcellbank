import { usePageTitle } from '../../lib/usePageTitle'
import { StaffShell, ComingSoon } from '../staff/StaffShell'

/**
 * Şube müdürü paneli. Müdür çalışan değildir; görüntüleme + onay rolündedir.
 * 10M–50M arası krediler ve yüksek havaleler onayına gelir (Sprint 2 ve 4).
 */
export function BranchManagerPanel() {
  usePageTitle('Şube Müdürü')
  return (
    <StaffShell
      title="Şube Müdürü Paneli"
      subtitle="Şubenizi görüntüleyin ve onayınıza düşen işlemleri yönetin."
    >
      <ComingSoon
        lead="Bu panelden şubenizi denetleyecek ve kararınıza düşen işlemleri onaylayacaksınız."
        upcoming={[
          'Kredi onay kuyruğu (10M – 50M TL bandı)',
          'Yüksek tutarlı havale onayı (1M TL üstü)',
          'Kart başvurusu onayı',
          'Şube çalışanları ve şube kredilerinin görünümü',
        ]}
      />
    </StaffShell>
  )
}
