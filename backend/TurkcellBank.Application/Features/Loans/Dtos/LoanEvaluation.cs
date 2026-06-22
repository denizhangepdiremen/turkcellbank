using TurkcellBank.Domain.Enums;

namespace TurkcellBank.Application.Features.Loans.Dtos;

/// <summary>
/// Değerlendirmeye girdi olan tek bir referans (benzer profil) kaydı.
/// Yapay zeka / kural motoru, başvuranı bu kayıtlarla karşılaştırır.
/// </summary>
public record LoanPeer(
    int Age,
    decimal MonthlyIncome,
    decimal MonthlyExpenses,
    MaritalStatus MaritalStatus,
    int ChildrenCount,
    HousingStatus HousingStatus,
    decimal GrantedAmount,
    int TermMonths,
    bool Defaulted);

/// <summary>
/// Kredi değerlendirme bağlamı: başvuranın profili + karşılaştırma için
/// benzer referans kayıtları. Borç düşümü ve nihai karar servis katmanında
/// (deterministik) yapılır; motorun görevi maksimum limiti tahmin etmektir.
/// </summary>
public record LoanEvaluationContext(
    string NationalId,
    int Age,
    MaritalStatus MaritalStatus,
    int ChildrenCount,
    HousingStatus HousingStatus,
    decimal Income,
    decimal MonthlyExpenses,
    int EmploymentMonths,
    string Profession,
    decimal RequestedAmount,
    int TermMonths,
    IReadOnlyList<LoanPeer> Peers);

/// <summary>Motorun çıktısı: tahmini maksimum limit + insan-okur gerekçe.</summary>
public record LoanAiResult(
    decimal MaxLimit,
    string Reason);
