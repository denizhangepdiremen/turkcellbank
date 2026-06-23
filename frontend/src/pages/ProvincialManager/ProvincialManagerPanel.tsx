import { usePageTitle } from '../../lib/usePageTitle'
import { StaffShell, ComingSoon } from '../staff/StaffShell'
import { LoanApprovalQueue } from '../staff/LoanApprovalQueue'

/**
 * İl müdürü paneli. 50M–100M arası krediler onayına gelir; diğer bantları
 * görüntüler (onaylayamaz). Şube/rapor görünümleri sonraki aşamada.
 */
export function ProvincialManagerPanel() {
  usePageTitle('İl Müdürü')
  return (
    <StaffShell
      title="İl Müdürü Paneli"
      subtitle="50M – 100M TL arası kredileri onaylayın; ilinizi yönetin."
    >
      <h2 className="staff-section-title">Kredi Onay Kuyruğu</h2>
      <LoanApprovalQueue />

      <h2 className="staff-section-title">Yakında</h2>
      <ComingSoon
        lead="Onay kuyruğunun yanında şu yetenekler eklenecek:"
        upcoming={[
          'İlinizdeki şube müdürleri ve şubelerin görünümü',
          'İl geneli kredi ve performans raporları',
        ]}
      />
    </StaffShell>
  )
}
