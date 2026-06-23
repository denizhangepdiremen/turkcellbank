import { usePageTitle } from '../../lib/usePageTitle'
import { StaffShell, ComingSoon } from '../staff/StaffShell'
import { LoanApprovalQueue } from '../staff/LoanApprovalQueue'

/**
 * Direktör paneli. 100M TL üstü krediler onayına gelir; tüm bantları görüntüler.
 * Global görünüm, raporlar ve audit log sonraki aşamalarda.
 */
export function DirectorPanel() {
  usePageTitle('Direktör')
  return (
    <StaffShell
      title="Direktör Paneli"
      subtitle="100M TL üstü kredileri onaylayın; tüm bankayı görüntüleyin."
    >
      <h2 className="staff-section-title">Kredi Onay Kuyruğu</h2>
      <LoanApprovalQueue />

      <h2 className="staff-section-title">Yakında</h2>
      <ComingSoon
        lead="Onay kuyruğunun yanında şu yetenekler eklenecek:"
        upcoming={[
          'İl müdürleri ve tüm banka görünümü',
          'Genel kredi ve performans raporları',
          'Denetim kaydı (audit log)',
        ]}
      />
    </StaffShell>
  )
}
