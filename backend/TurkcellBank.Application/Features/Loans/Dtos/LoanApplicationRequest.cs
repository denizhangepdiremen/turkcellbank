namespace TurkcellBank.Application.Features.Loans.Dtos;

/// <summary>Kredi başvuru isteği.</summary>
public record LoanApplicationRequest(
    decimal Income,
    string Profession,
    decimal Amount,
    int TermMonths);
