import { usePageTitle } from '../../lib/usePageTitle'
import { StaffShell, StaffTabs } from '../staff/StaffShell'
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
      <StaffTabs
        tabs={[
          { id: 'loans', label: 'Kredi Onayları', content: <LoanApprovalQueue /> },
          { id: 'transfers', label: 'Yüksek Havale', content: <TransferApprovalQueue /> },
          { id: 'cards', label: 'Kart Onayları', content: <CardApprovalQueue /> },
          { id: 'org', label: 'Şubem', content: <OrgTeamView /> },
        ]}
      />
    </StaffShell>
  )
}
