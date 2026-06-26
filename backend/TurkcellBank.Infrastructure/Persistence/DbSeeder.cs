using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using TurkcellBank.Application.Common;
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
        await SeedDemoCustomersAsync(db, passwordHasher, configuration);
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
            NationalId = GenerateValidTc(600000000L),
            PasswordHash = passwordHasher.Hash(password),
            Role = UserRole.Admin,
            CreatedAt = DateTime.UtcNow,
        };

        db.Users.Add(admin);
        await db.SaveChangesAsync();
    }

    // Demo organizasyon: 4 il, toplam 13 şube.
    // NOT: Seeder additive (idempotent) çalıştığından yeni il/şubeler dizinin SONUNA
    // eklenmelidir — mevcut şube kodları (SB001..) konuma göre atandığı için araya
    // ekleme kodları kaydırır. (citySlug ile email-dostu, Türkçe karaktersiz adresler.)
    private static readonly (string City, string CitySlug, (string District, string Slug)[] Districts)[] Org =
    {
        ("İstanbul", "istanbul", new[] { ("Kadıköy", "kadikoy"), ("Şişli", "sisli"), ("Beşiktaş", "besiktas") }),
        ("Ankara", "ankara", new[] { ("Çankaya", "cankaya"), ("Keçiören", "kecioren"), ("Yenimahalle", "yenimahalle") }),
        // İzmir'e yeni şube (Çiğli) — mevcut ile yeni şube eklenmesi örneği
        ("İzmir", "izmir", new[] { ("Konak", "konak"), ("Bornova", "bornova"), ("Karşıyaka", "karsiyaka"), ("Çiğli", "cigli") }),
        // Yeni il (Bursa) — yeni il müdürü + 3 yeni şube
        ("Bursa", "bursa", new[] { ("Nilüfer", "nilufer"), ("Osmangazi", "osmangazi"), ("Yıldırım", "yildirim") }),
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
        var staffPassword = configuration["StaffSeed:Password"];
        if (string.IsNullOrWhiteSpace(staffPassword)) return; // şifre yoksa personel seed'i yapma

        var passwordHash = passwordHasher.Hash(staffPassword);
        var rng = new Random(20260623); // sabit tohum -> deterministik personel sayısı

        // Additive (idempotent): mevcut şube kodlarını ve personel e-postalarını al;
        // yalnızca eksik olanlar eklenir. Böylece restart'ta yeni il/şube/çalışan
        // mevcut veriyi bozmadan eklenir, var olanlar tekrar oluşturulmaz.
        var existingCodes = (await db.Branches.Select(b => b.Code).ToListAsync()).ToHashSet();
        var existingEmails = (await db.Users.Select(u => u.Email).ToListAsync()).ToHashSet();

        var branches = new List<Branch>();
        var staff = new List<User>();
        var staffTcSeed = 700000000L;

        string NextStaffTc() => GenerateValidTc(staffTcSeed++);

        void AddStaffIfMissing(User u)
        {
            if (existingEmails.Add(u.Email)) staff.Add(u);
        }

        var branchNo = 0;
        foreach (var (city, citySlug, districts) in Org)
        {
            foreach (var (district, slug) in districts)
            {
                branchNo++;
                var code = $"SB{branchNo:D3}";
                var employeeCount = rng.Next(1, 4); // rng sırası korunsun diye her zaman çekilir

                // Şube zaten varsa (mevcut DB) bu şubeyi ve personelini atla
                if (existingCodes.Contains(code)) continue;

                var branch = new Branch
                {
                    Id = Guid.NewGuid(),
                    Code = code,
                    Name = $"{city} {district} Şubesi",
                    City = city,
                    CreatedAt = DateTime.UtcNow,
                };
                branches.Add(branch);

                // Şube müdürü (her şubede 1)
                AddStaffIfMissing(new User
                {
                    Id = Guid.NewGuid(),
                    FullName = $"{district} Şube Müdürü",
                    Email = $"mudur.{slug}@turkcellbank.com",
                    NationalId = NextStaffTc(),
                    PasswordHash = passwordHash,
                    Role = UserRole.BranchManager,
                    BranchId = branch.Id,
                    City = city,
                    CreatedAt = DateTime.UtcNow,
                });

                // Şube çalışanları (1-3 arası)
                for (var n = 1; n <= employeeCount; n++)
                {
                    AddStaffIfMissing(new User
                    {
                        Id = Guid.NewGuid(),
                        FullName = $"{district} Çalışan {n}",
                        Email = $"calisan{n}.{slug}@turkcellbank.com",
                        NationalId = NextStaffTc(),
                        PasswordHash = passwordHash,
                        Role = UserRole.BranchEmployee,
                        BranchId = branch.Id,
                        City = city,
                        CreatedAt = DateTime.UtcNow,
                    });
                }
            }

            // İl müdürü (her ilde 1) — belirli bir şubeye bağlı değil, ile bağlı
            AddStaffIfMissing(new User
            {
                Id = Guid.NewGuid(),
                FullName = $"{city} İl Müdürü",
                Email = $"ilmudur.{citySlug}@turkcellbank.com",
                NationalId = NextStaffTc(),
                PasswordHash = passwordHash,
                Role = UserRole.ProvincialManager,
                City = city,
                CreatedAt = DateTime.UtcNow,
            });
        }

        // Direktör (tüm banka, tek) — il/şube bağı yok
        AddStaffIfMissing(new User
        {
            Id = Guid.NewGuid(),
            FullName = "Genel Direktör",
            Email = "direktor@turkcellbank.com",
            NationalId = NextStaffTc(),
            PasswordHash = passwordHash,
            Role = UserRole.Director,
            CreatedAt = DateTime.UtcNow,
        });

        if (branches.Count == 0 && staff.Count == 0) return; // eklenecek yeni şey yok

        db.Branches.AddRange(branches);
        db.Users.AddRange(staff);
        await db.SaveChangesAsync();
    }

    // Demo müşteri adları (deterministik atanır)
    private static readonly string[] DemoCustomerNames =
    {
        "Ayşe Yılmaz", "Mehmet Demir", "Zeynep Kaya", "Ahmet Çelik", "Elif Şahin",
        "Mustafa Aydın", "Fatma Arslan", "Can Doğan", "Merve Koç", "Burak Yıldız",
    };

    /// <summary>
    /// Demo müşterileri seed'ler: geçerli TC + e-posta + 1-2 hesap (bakiyeli).
    /// Yöneticiler "Müşteri Hesapları"nda arayıp grafiklerini görebilsin diye.
    /// E-postaya göre idempotent; şifre StaffSeed:Password'tan okunur (demo).
    /// </summary>
    private static async Task SeedDemoCustomersAsync(
        AppDbContext db, IPasswordHasher passwordHasher, IConfiguration configuration)
    {
        var demoPassword = configuration["StaffSeed:Password"];
        if (string.IsNullOrWhiteSpace(demoPassword)) return;

        var existingEmails = (await db.Users.Select(u => u.Email).ToListAsync()).ToHashSet();
        var passwordHash = passwordHasher.Hash(demoPassword);
        var rng = new Random(20260625); // sabit tohum -> deterministik bakiye/hesap

        var newUsers = new List<User>();
        var newAccounts = new List<Account>();

        for (var i = 0; i < DemoCustomerNames.Length; i++)
        {
            var email = $"musteri{i + 1}@demo.turkcellbank.com";
            if (existingEmails.Contains(email)) continue;

            var userId = Guid.NewGuid();
            newUsers.Add(new User
            {
                Id = userId,
                FullName = DemoCustomerNames[i],
                Email = email,
                PasswordHash = passwordHash,
                Role = UserRole.Customer,
                NationalId = GenerateValidTc(200000000L + i * 1234567L),
                CreatedAt = DateTime.UtcNow,
            });

            // Her müşteriye 1-2 hesap, bakiyeli
            var accountCount = rng.Next(1, 3);
            for (var a = 0; a < accountCount; a++)
            {
                newAccounts.Add(new Account
                {
                    Id = Guid.NewGuid(),
                    UserId = userId,
                    Iban = IbanGenerator.Generate(),
                    AccountType = rng.NextDouble() < 0.8 ? AccountType.Bireysel : AccountType.Isletme,
                    Balance = Math.Round((5000m + (decimal)rng.NextDouble() * 245000m) / 100m) * 100m,
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow,
                });
            }
        }

        if (newUsers.Count == 0) return;

        db.Users.AddRange(newUsers);
        db.Accounts.AddRange(newAccounts);
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
