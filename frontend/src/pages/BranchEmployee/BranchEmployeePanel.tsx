import { usePageTitle } from '../../lib/usePageTitle'
import { StaffShell, ComingSoon } from '../staff/StaffShell'

/**
 * Şube çalışanı paneli. Çalışan, şubeye gelen müşteriler adına işlem yapar
 * (herkes internet bankacılığı kullanmaz). İşlevler Sprint 3'te eklenecek.
 */
export function BranchEmployeePanel() {
  usePageTitle('Şube Çalışanı')
  return (
    <StaffShell
      title="Şube Çalışanı Paneli"
      subtitle="Şubeye gelen müşteriler adına işlem yapın."
    >
      <ComingSoon
        lead="Bu panelden, masanıza gelen müşteri için işlemleri siz yürüteceksiniz."
        upcoming={[
          'Müşteri arama (TC kimlik / hesap no)',
          'Müşteri adına hesap açma ve para işlemleri',
          'Müşteri adına kredi başvurusu',
          'Müşteri adına kart başvurusu',
        ]}
      />
    </StaffShell>
  )
}
