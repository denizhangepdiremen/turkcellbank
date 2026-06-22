using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using TurkcellBank.Application.Features.Loans;
using TurkcellBank.Application.Features.Loans.Dtos;
using TurkcellBank.Domain.Enums;

namespace TurkcellBank.Infrastructure.Ai;

/// <summary>
/// Gemini (Google AI Studio) tabanlı kredi değerlendirme motoru. Başvuranın
/// profilini ve benzer referans kayıtlarını bir prompt'a koyup modelden
/// JSON formatında {maxLimit, reason} ister. Herhangi bir hata/zaman aşımı
/// durumunda deterministik kural motoruna (RuleBased) düşer — başvuru asla
/// AI hatası yüzünden başarısız olmaz.
///
/// Yapılandırma: Gemini:ApiKey (user-secrets), Gemini:Model, Gemini:BaseUrl.
/// </summary>
public class GeminiLoanAiEvaluator : ILoanAiEvaluator
{
    private readonly HttpClient _http;
    private readonly RuleBasedLoanAiEvaluator _fallback;
    private readonly ILogger<GeminiLoanAiEvaluator> _logger;
    private readonly string _apiKey;
    private readonly string _model;
    private readonly string _baseUrl;

    public GeminiLoanAiEvaluator(
        HttpClient http,
        RuleBasedLoanAiEvaluator fallback,
        IConfiguration configuration,
        ILogger<GeminiLoanAiEvaluator> logger)
    {
        _http = http;
        _fallback = fallback;
        _logger = logger;
        _apiKey = configuration["Gemini:ApiKey"] ?? string.Empty;
        _model = configuration["Gemini:Model"] ?? "gemini-2.5-flash";
        _baseUrl = configuration["Gemini:BaseUrl"] ?? "https://generativelanguage.googleapis.com";
    }

    public async Task<LoanAiResult> EvaluateAsync(
        LoanEvaluationContext context, CancellationToken cancellationToken = default)
    {
        try
        {
            var prompt = BuildPrompt(context);

            var requestBody = new
            {
                contents = new[]
                {
                    new { parts = new[] { new { text = prompt } } },
                },
                generationConfig = new
                {
                    temperature = 0.2,
                    responseMimeType = "application/json",
                    // 2.5-flash bir "thinking" modeldir; bu yapısal görevde düşünmeyi
                    // kapatmak yanıtı ~1 sn'ye indirir (timeout/maliyet için kritik).
                    thinkingConfig = new { thinkingBudget = 0 },
                },
            };

            var url = $"{_baseUrl}/v1beta/models/{_model}:generateContent?key={_apiKey}";

            using var response = await _http.PostAsJsonAsync(url, requestBody, cancellationToken);
            if (!response.IsSuccessStatusCode)
            {
                var err = await response.Content.ReadAsStringAsync(cancellationToken);
                _logger.LogWarning(
                    "Gemini çağrısı başarısız ({Status}); kural motoruna düşülüyor. Detay: {Err}",
                    (int)response.StatusCode, Truncate(err, 400));
                return await _fallback.EvaluateAsync(context, cancellationToken);
            }

            using var stream = await response.Content.ReadAsStreamAsync(cancellationToken);
            using var doc = await JsonDocument.ParseAsync(stream, cancellationToken: cancellationToken);

            // candidates[0].content.parts[0].text -> içinde {maxLimit, reason} JSON'u
            var text = doc.RootElement
                .GetProperty("candidates")[0]
                .GetProperty("content")
                .GetProperty("parts")[0]
                .GetProperty("text")
                .GetString();

            if (string.IsNullOrWhiteSpace(text))
                return await _fallback.EvaluateAsync(context, cancellationToken);

            using var inner = JsonDocument.Parse(text);
            var root = inner.RootElement;

            var maxLimit = ReadDecimal(root, "maxLimit");
            var reason = root.TryGetProperty("reason", out var r) ? r.GetString() : null;

            if (maxLimit <= 0)
                return await _fallback.EvaluateAsync(context, cancellationToken);

            // En yakın 100 TL'ye yuvarla
            maxLimit = Math.Round(maxLimit / 100m) * 100m;

            reason = string.IsNullOrWhiteSpace(reason)
                ? $"Yapay zeka değerlendirmesine göre tahmini maksimum kredi limitiniz {maxLimit:N0} TL."
                : reason!.Trim();

            return new LoanAiResult(maxLimit, reason);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Gemini değerlendirmesinde hata; kural motoruna düşülüyor.");
            return await _fallback.EvaluateAsync(context, cancellationToken);
        }
    }

    private static string BuildPrompt(LoanEvaluationContext c)
    {
        var sb = new StringBuilder();
        sb.AppendLine("Sen bir bankanın kredi değerlendirme uzmanısın. Aşağıdaki başvuranın");
        sb.AppendLine("profilini, geçmişte kredi almış benzer müşterilerin verileriyle karşılaştırarak");
        sb.AppendLine("bu kişiye verilebilecek MAKSİMUM kredi limitini (TL) tahmin et.");
        sb.AppendLine("Temerrüde düşmüş (geri ödeyememiş) müşterileri olumsuz örnek olarak dikkate al.");
        sb.AppendLine("Limit, kişinin gelirine ve ödeme gücüne göre gerçekçi olmalı.");
        sb.AppendLine();
        sb.AppendLine("Başvuran:");
        sb.AppendLine($"- Yaş: {c.Age}");
        sb.AppendLine($"- Medeni hal: {(c.MaritalStatus == MaritalStatus.Married ? "Evli" : "Bekar")}");
        sb.AppendLine($"- Çocuk sayısı: {c.ChildrenCount}");
        sb.AppendLine($"- Konut: {(c.HousingStatus == HousingStatus.Owner ? "Ev sahibi" : "Kiracı")}");
        sb.AppendLine($"- Aylık gelir: {c.Income:N0} TL");
        sb.AppendLine($"- Aylık gider: {c.MonthlyExpenses:N0} TL");
        sb.AppendLine($"- Çalışma kıdemi: {c.EmploymentMonths} ay");
        sb.AppendLine($"- Meslek: {c.Profession}");
        sb.AppendLine($"- Talep edilen tutar: {c.RequestedAmount:N0} TL / {c.TermMonths} ay");
        sb.AppendLine();
        sb.AppendLine(BuildCohortSummary(c.Peers));
        sb.AppendLine();
        sb.AppendLine($"Benzer müşteri verileri ({c.Peers.Count} adet) [gelir | gider | yaş | çocuk | konut | verilen kredi | vade | temerrüt]:");
        foreach (var p in c.Peers)
        {
            sb.AppendLine(
                $"- {p.MonthlyIncome:N0} | {p.MonthlyExpenses:N0} | {p.Age} | {p.ChildrenCount} | " +
                $"{(p.HousingStatus == HousingStatus.Owner ? "ev sahibi" : "kiracı")} | " +
                $"{p.GrantedAmount:N0} | {p.TermMonths} ay | {(p.Defaulted ? "TEMERRÜT" : "ödedi")}");
        }
        sb.AppendLine();
        sb.AppendLine("SADECE şu JSON formatında yanıt ver, başka metin ekleme:");
        sb.AppendLine("{\"maxLimit\": <sayı, TL>, \"reason\": \"<Türkçe 1-2 cümle gerekçe>\"}");

        return sb.ToString();
    }

    /// <summary>
    /// Benzer kohortun toplu istatistiği — modele sayısal çıpa verir:
    /// temerrüt oranı + (geri ödeyenlerde) ortalama verilen kredi ve kredi/gelir katsayısı.
    /// </summary>
    private static string BuildCohortSummary(IReadOnlyList<LoanPeer> peers)
    {
        if (peers.Count == 0)
            return "Kohort özeti: benzer kayıt bulunamadı.";

        var defaulted = peers.Count(p => p.Defaulted);
        var defaultRate = 100.0 * defaulted / peers.Count;

        var paid = peers.Where(p => !p.Defaulted && p.MonthlyIncome > 0).ToList();
        var avgMultiple = paid.Count > 0
            ? paid.Average(p => (double)(p.GrantedAmount / p.MonthlyIncome))
            : 0;
        var avgGranted = paid.Count > 0
            ? paid.Average(p => (double)p.GrantedAmount)
            : 0;

        return
            $"Kohort özeti (bu {peers.Count} benzer müşteri): " +
            $"temerrüt oranı %{defaultRate:N0}; " +
            $"geri ödeyenlerde ortalama verilen kredi {avgGranted:N0} TL, " +
            $"ortalama (verilen kredi / aylık gelir) katsayısı {avgMultiple:N1}. " +
            $"Limit tahminini bu kohortun ödeme davranışıyla tutarlı yap.";
    }

    private static decimal ReadDecimal(JsonElement root, string name)
    {
        if (!root.TryGetProperty(name, out var el)) return 0m;

        if (el.ValueKind == JsonValueKind.Number && el.TryGetDecimal(out var d))
            return d;

        // Beklenmedik şekilde metin dönerse: yalnızca rakamları al (tam TL)
        if (el.ValueKind == JsonValueKind.String)
        {
            var digits = new string((el.GetString() ?? "").Where(char.IsDigit).ToArray());
            if (long.TryParse(digits, out var n)) return n;
        }

        return 0m;
    }

    private static string Truncate(string s, int max)
        => s.Length <= max ? s : s[..max];
}
