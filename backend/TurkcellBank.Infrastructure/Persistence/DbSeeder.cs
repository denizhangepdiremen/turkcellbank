using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using TurkcellBank.Application.Common.Interfaces;
using TurkcellBank.Domain.Entities;
using TurkcellBank.Domain.Enums;

namespace TurkcellBank.Infrastructure.Persistence;

/// <summary>
/// Açılışta temel verileri hazırlar:
///  1) Sistemde hiç admin yoksa varsayılan admin (yapılandırmadan).
///  2) Kredi değerlendirmesi için FAKE referans nüfus (~300 kayıt).
///  3) FAKE diğer banka kredileri (TC ile sorgulanan demo verisi).
/// Her blok kendi tablosu boşsa çalışır (idempotent). Üretim deterministiktir
/// (sabit Random tohumu) — her ortamda aynı veri oluşur.
/// </summary>
public static class DbSeeder
{
    private static readonly string[] Professions =
    {
        "Yazılımcı", "Mühendis", "Öğretmen", "Doktor", "Avukat",
        "Muhasebeci", "Satış Temsilcisi", "Hemşire", "Memur", "Esnaf",
    };

    public static async Task SeedAsync(
        AppDbContext db,
        IPasswordHasher passwordHasher,
        IConfiguration configuration)
    {
        await SeedAdminAsync(db, passwordHasher, configuration);
        await SeedBranchesAndStaffAsync(db, passwordHasher, configuration);
        await SeedReferenceCreditRecordsAsync(db);
        await SeedExternalBankLoansAsync(db);
    }

    private static async Task SeedAdminAsync(
        AppDbContext db, IPasswordHasher passwordHasher, IConfiguration configuration)
    {
        // Zaten admin varsa hiçbir şey yapma
        var adminExists = await db.Users.AnyAsync(u => u.Role == UserRole.Admin);
        if (adminExists) return;

        var email = configuration["AdminSeed:Email"];
        var password = configuration["AdminSeed:Password"];

        // Yapılandırma eksikse seed yapma (sessizce admin oluşturma)
        if (string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(password))
            return;

        var admin = new User
        {
            Id = Guid.NewGuid(),
            FullName = "Sistem Admin",
            Email = email,
            PasswordHash = passwordHasher.Hash(password),
            Role = UserRole.Admin,
            CreatedAt = DateTime.UtcNow,
        };

        db.Users.Add(admin);
        await db.SaveChangesAsync();
    }

    // Demo organizasyon: 3 il, her ilde 3 ilçe/şube = toplam 9 şube.
    // (citySlug ile email-dostu, Türkçe karaktersiz adresler üretilir.)
    private static readonly (string City, string CitySlug, (string District, string Slug)[] Districts)[] Org =
    {
        ("İstanbul", "istanbul", new[] { ("Kadıköy", "kadikoy"), ("Şişli", "sisli"), ("Beşiktaş", "besiktas") }),
        ("Ankara", "ankara", new[] { ("Çankaya", "cankaya"), ("Keçiören", "kecioren"), ("Yenimahalle", "yenimahalle") }),
        ("İzmir", "izmir", new[] { ("Konak", "konak"), ("Bornova", "bornova"), ("Karşıyaka", "karsiyaka") }),
    };

    /// <summary>
    /// Banka organizasyonunu seed'ler: 9 şube + personel hiyerarşisi
    /// (her şubede 1 şube müdürü + 1-3 çalışan, her ilde 1 il müdürü, 1 direktör).
    /// Personel şifresi config'den (StaffSeed:Password) okunur; yoksa sessizce atlanır
    /// (admin seed'i gibi — sır repoya girmez). Şubeler zaten varsa hiçbir şey yapmaz.
    /// </summary>
    private static async Task SeedBranchesAndStaffAsync(
        AppDbContext db, IPasswordHasher passwordHasher, IConfiguration configuration)
    {
        if (await db.Branches.AnyAsync()) return;

        var staffPassword = configuration["StaffSeed:Password"];
        if (string.IsNullOrWhiteSpace(staffPassword)) return; // şifre yoksa personel seed'i yapma

        var passwordHash = passwordHasher.Hash(staffPassword);
        var rng = new Random(20260623); // sabit tohum -> deterministik personel sayısı
        var branches = new List<Branch>();
        var staff = new List<User>();

        var branchNo = 0;
        foreach (var (city, citySlug, districts) in Org)
        {
            foreach (var (district, slug) in districts)
            {
                branchNo++;
                var branch = new Branch
                {
                    Id = Guid.NewGuid(),
                    Code = $"SB{branchNo:D3}",
                    Name = $"{city} {district} Şubesi",
                    City = city,
                    CreatedAt = DateTime.UtcNow,
                };
                branches.Add(branch);

                // Şube müdürü (her şubede 1)
                staff.Add(new User
                {
                    Id = Guid.NewGuid(),
                    FullName = $"{district} Şube Müdürü",
                    Email = $"mudur.{slug}@turkcellbank.com",
                    PasswordHash = passwordHash,
                    Role = UserRole.BranchManager,
                    BranchId = branch.Id,
                    City = city,
                    CreatedAt = DateTime.UtcNow,
                });

                // Şube çalışanları (1-3 arası)
                var employeeCount = rng.Next(1, 4);
                for (var n = 1; n <= employeeCount; n++)
                {
                    staff.Add(new User
                    {
                        Id = Guid.NewGuid(),
                        FullName = $"{district} Çalışan {n}",
                        Email = $"calisan{n}.{slug}@turkcellbank.com",
                        PasswordHash = passwordHash,
                        Role = UserRole.BranchEmployee,
                        BranchId = branch.Id,
                        City = city,
                        CreatedAt = DateTime.UtcNow,
                    });
                }
            }

            // İl müdürü (her ilde 1) — belirli bir şubeye bağlı değil, ile bağlı
            staff.Add(new User
            {
                Id = Guid.NewGuid(),
                FullName = $"{city} İl Müdürü",
                Email = $"ilmudur.{citySlug}@turkcellbank.com",
                PasswordHash = passwordHash,
                Role = UserRole.ProvincialManager,
                City = city,
                CreatedAt = DateTime.UtcNow,
            });
        }

        // Direktör (tüm banka) — il/şube bağı yok
        staff.Add(new User
        {
            Id = Guid.NewGuid(),
            FullName = "Genel Direktör",
            Email = "direktor@turkcellbank.com",
            PasswordHash = passwordHash,
            Role = UserRole.Director,
            CreatedAt = DateTime.UtcNow,
        });

        db.Branches.AddRange(branches);
        db.Users.AddRange(staff);
        await db.SaveChangesAsync();
    }

    // Referans nüfus büyüklüğü (fazla veri = daha isabetli limit tahmini).
    private const int ReferenceRecordCount = 30000;

    /// <summary>Kredi limiti tahmini için fake referans kayıtları (deterministik).</summary>
    private static async Task SeedReferenceCreditRecordsAsync(AppDbContext db)
    {
        if (await db.ReferenceCreditRecords.AnyAsync()) return;

        var rng = new Random(20260622); // sabit tohum -> deterministik veri
        var records = new List<ReferenceCreditRecord>(ReferenceRecordCount);

        for (var i = 0; i < ReferenceRecordCount; i++)
        {
            // Aylık net gelir: ~25.000 - 200.000 TL
            var income = Math.Round(25000m + (decimal)rng.NextDouble() * 175000m, 2);
            // Gider: gelirin %40-%80'i
            var expenses = Math.Round(income * (0.40m + (decimal)rng.NextDouble() * 0.40m), 2);

            var age = rng.Next(22, 66);
            var marital = rng.NextDouble() < 0.55 ? MaritalStatus.Married : MaritalStatus.Single;
            var children = marital == MaritalStatus.Married ? rng.Next(0, 4) : rng.Next(0, 2);
            var housing = rng.NextDouble() < 0.45 ? HousingStatus.Owner : HousingStatus.Tenant;
            var term = new[] { 12, 24, 36, 48, 60 }[rng.Next(5)];

            // Verilen kredi: gelirin ~6-14 katı
            var multiple = 6m + (decimal)rng.NextDouble() * 8m;
            var granted = Math.Round(income * multiple / 100m) * 100m;

            // Temerrüt olasılığı: gider oranı ve kredi/gelir katı yükseldikçe artar
            var expenseRatio = expenses / income;
            var defaultProb = 0.05 + (double)(expenseRatio - 0.4m) * 0.4 + ((double)multiple - 6) * 0.02;
            var defaulted = rng.NextDouble() < Math.Clamp(defaultProb, 0.02, 0.45);

            records.Add(new ReferenceCreditRecord
            {
                Id = Guid.NewGuid(),
                Age = age,
                MonthlyIncome = income,
                MonthlyExpenses = expenses,
                MaritalStatus = marital,
                ChildrenCount = children,
                HousingStatus = housing,
                Profession = Professions[rng.Next(Professions.Length)],
                GrantedAmount = granted,
                TermMonths = term,
                Defaulted = defaulted,
            });
        }

        // 30k kayıt için değişiklik takibini geçici kapat (toplu insert hızlanır)
        db.ChangeTracker.AutoDetectChangesEnabled = false;
        try
        {
            db.ReferenceCreditRecords.AddRange(records);
            await db.SaveChangesAsync();
        }
        finally
        {
            db.ChangeTracker.AutoDetectChangesEnabled = true;
        }
    }

    /// <summary>
    /// Diğer bankalardaki fake kredi kayıtları. Belirli (geçerli) TC kimlik
    /// numaralarına bağlanır; demoda bu TC'lerle başvurulduğunda "diğer banka
    /// borcu" net limitten düşülür. Kullanılabilir TC'ler README'de listelenir.
    /// </summary>
    private static async Task SeedExternalBankLoansAsync(AppDbContext db)
    {
        if (await db.ExternalBankLoans.AnyAsync()) return;

        var banks = new[] { "Ziraat Bankası", "İş Bankası", "Garanti BBVA", "Akbank", "Yapı Kredi" };
        var rng = new Random(987654);
        var loans = new List<ExternalBankLoan>();

        // 10 geçerli TC üret; her birine 1-3 kredi ata (~25 kayıt)
        var baseNine = 100000000L;
        for (var i = 0; i < 10; i++)
        {
            var tc = GenerateValidTc(baseNine + i * 7654321L);
            var loanCount = rng.Next(1, 4); // 1-3

            for (var j = 0; j < loanCount; j++)
            {
                var original = Math.Round((20000m + (decimal)rng.NextDouble() * 130000m) / 100m) * 100m;
                var remaining = Math.Round(original * (decimal)(0.2 + rng.NextDouble() * 0.7), 2);
                var installment = Math.Round(original / new[] { 12, 24, 36 }[rng.Next(3)], 2);

                loans.Add(new ExternalBankLoan
                {
                    Id = Guid.NewGuid(),
                    NationalId = tc,
                    BankName = banks[rng.Next(banks.Length)],
                    OriginalAmount = original,
                    RemainingDebt = remaining,
                    MonthlyInstallment = installment,
                });
            }
        }

        db.ExternalBankLoans.AddRange(loans);
        await db.SaveChangesAsync();
    }

    /// <summary>
    /// 9 haneli tabandan resmi algoritmaya uygun (geçerli) 11 haneli TC üretir.
    /// 10. hane = ((tek konum toplamı)*7 - (çift konum toplamı)) mod 10
    /// 11. hane = (ilk 10 hane toplamı) mod 10
    /// </summary>
    private static string GenerateValidTc(long baseNine)
    {
        var s = (baseNine % 1000000000).ToString("D9");
        if (s[0] == '0') s = "1" + s.Substring(1); // ilk hane 0 olamaz
        var d = s.Select(ch => ch - '0').ToArray();

        var oddSum = d[0] + d[2] + d[4] + d[6] + d[8];
        var evenSum = d[1] + d[3] + d[5] + d[7];
        var tenth = ((oddSum * 7) - evenSum) % 10;
        if (tenth < 0) tenth += 10;

        var first10Sum = oddSum + evenSum + tenth;
        var eleventh = first10Sum % 10;

        return s + tenth.ToString() + eleventh.ToString();
    }
}
