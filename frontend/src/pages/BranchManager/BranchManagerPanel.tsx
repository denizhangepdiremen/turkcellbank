import { usePageTitle } from '../../lib/usePageTitle'
import { StaffShell } from '../staff/StaffShell'
import { LoanApprovalQueue } from '../staff/LoanApprovalQueue'
import { TransferApprovalQueue } from '../staff/TransferApprovalQueue'
import { CardApprovalQueue } from '../staff/CardApprovalQueue'
import { OrgTeamView } from '../staff/OrgTeamView'

/**
 * Şube müdürü paneli. Müdür çalışan değildir; görüntüleme + onay rolündedir.
 * 10M–50M kredi, 1M üstü havale ve kart başvurularını onaylar; şubesini görür.
 */
export function BranchManagerPanel() {
  usePageTitle('Şube Müdürü')
  return (
    <StaffShell
      title="Şube Müdürü Paneli"
      subtitle="Kredi, yüksek havale ve kart onayları; şube görünümü."
    >
      <h2 className="staff-section-title">Kredi Onay Kuyruğu</h2>
      <LoanApprovalQueue />

      <h2 className="staff-section-title">Yüksek Havale Onayı</h2>
      <TransferApprovalQueue />

      <h2 className="staff-section-title">Kart Onay Kuyruğu</h2>
      <CardApprovalQueue />

      <h2 className="staff-section-title">Şubem</h2>
      <OrgTeamView />
    </StaffShell>
  )
}
