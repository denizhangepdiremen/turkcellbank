import { usePageTitle } from '../../lib/usePageTitle'
import { StaffShell, ComingSoon } from '../staff/StaffShell'
import { LoanApprovalQueue } from '../staff/LoanApprovalQueue'

/**
 * Şube müdürü paneli. Müdür çalışan değildir; görüntüleme + onay rolündedir.
 * 10M–50M arası krediler onayına gelir; üst bantları görüntüler (onaylayamaz).
 */
export function BranchManagerPanel() {
  usePageTitle('Şube Müdürü')
  return (
    <StaffShell
      title="Şube Müdürü Paneli"
      subtitle="10M – 50M TL arası kredileri onaylayın; şubenizi görüntüleyin."
    >
      <h2 className="staff-section-title">Kredi Onay Kuyruğu</h2>
      <LoanApprovalQueue />

      <h2 className="staff-section-title">Yakında</h2>
      <ComingSoon
        lead="Onay kuyruğunun yanında şu yetenekler eklenecek:"
        upcoming={[
          'Yüksek tutarlı havale onayı (1M TL üstü)',
          'Kart başvurusu onayı',
          'Şube çalışanları ve şube kredilerinin görünümü',
        ]}
      />
    </StaffShell>
  )
}
