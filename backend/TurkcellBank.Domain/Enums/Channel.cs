namespace TurkcellBank.Domain.Enums;

/// <summary>
/// İşlemin yapıldığı kanal. İnternet bankacılığı (müşterinin kendisi) veya
/// Şube (şube çalışanının müşteri adına yaptığı işlem). Denetim/izlenebilirlik
/// için işlem kayıtlarına yazılır.
/// </summary>
public enum Channel
{
    Internet,
    Branch,
    Automatic, // düzenli ödeme talimatı tarafından otomatik yapılan işlem
}
