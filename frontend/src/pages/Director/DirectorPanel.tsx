import { usePageTitle } from '../../lib/usePageTitle'
import { StaffShell, ComingSoon } from '../staff/StaffShell'

/**
 * Direktör paneli. Tüm bankayı görür; 100M TL üstü krediler onayına gelir
 * (Sprint 2 ve 4). Audit log ve genel raporlar Sprint 5'te.
 */
export function DirectorPanel() {
  usePageTitle('Direktör')
  return (
    <StaffShell
      title="Direktör Paneli"
      subtitle="Tüm bankayı görüntüleyin ve en yüksek tutarlı kredileri onaylayın."
    >
      <ComingSoon
        lead="Bu panelden tüm bankayı denetleyecek ve en büyük kredileri onaylayacaksınız."
        upcoming={[
          'Kredi onay kuyruğu (100M TL üstü)',
          'İl müdürleri ve tüm banka görünümü',
          'Genel kredi ve performans raporları',
          'Denetim kaydı (audit log)',
        ]}
      />
    </StaffShell>
  )
}
