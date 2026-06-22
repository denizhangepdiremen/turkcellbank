using TurkcellBank.Application.Features.Loans.Dtos;

namespace TurkcellBank.Application.Features.Loans;

/// <summary>
/// Kredi değerlendirme motoru soyutlaması. Başvuranın profilini ve benzer
/// referans kayıtlarını alıp tahmini bir maksimum kredi limiti döner.
/// Sağlayıcı arkada değiştirilebilir:
///   - <c>RuleBasedLoanAiEvaluator</c> (deterministik, offline; API key gerekmez)
///   - <c>GeminiLoanAiEvaluator</c> (gerçek LLM; Gemini:ApiKey yapılandırılınca)
/// Seçim DI'da yapılır (Infrastructure/DependencyInjection).
/// </summary>
public interface ILoanAiEvaluator
{
    Task<LoanAiResult> EvaluateAsync(LoanEvaluationContext context, CancellationToken cancellationToken = default);
}
