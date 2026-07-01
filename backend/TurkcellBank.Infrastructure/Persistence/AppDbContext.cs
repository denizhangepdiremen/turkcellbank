using Microsoft.EntityFrameworkCore;
using TurkcellBank.Domain.Entities;

namespace TurkcellBank.Infrastructure.Persistence;

/// <summary>
/// AppDbContext: EF Core'un veritabanına açılan kapısı.
/// DbSet'ler = tablolar. OnModelCreating = tablo kuralları (unique, ilişki vb.).
/// </summary>
public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options)
        : base(options)
    {
    }

    public DbSet<User> Users => Set<User>();
    public DbSet<Branch> Branches => Set<Branch>();
    public DbSet<Account> Accounts => Set<Account>();
    public DbSet<Transaction> Transactions => Set<Transaction>();
    public DbSet<LoanApplication> LoanApplications => Set<LoanApplication>();
    public DbSet<Payment> Payments => Set<Payment>();
    public DbSet<Card> Cards => Set<Card>();
    public DbSet<ReferenceCreditRecord> ReferenceCreditRecords => Set<ReferenceCreditRecord>();
    public DbSet<ExternalBankLoan> ExternalBankLoans => Set<ExternalBankLoan>();
    public DbSet<PendingTransfer> PendingTransfers => Set<PendingTransfer>();
    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();
    public DbSet<Notification> Notifications => Set<Notification>();
    public DbSet<SavedRecipient> SavedRecipients => Set<SavedRecipient>();
    public DbSet<BillPayment> BillPayments => Set<BillPayment>();
    public DbSet<PaymentOrder> PaymentOrders => Set<PaymentOrder>();
    public DbSet<TimeDeposit> TimeDeposits => Set<TimeDeposit>();
    public DbSet<ExchangeRate> ExchangeRates => Set<ExchangeRate>();
    public DbSet<FxTrade> FxTrades => Set<FxTrade>();
    public DbSet<FxRateAlert> FxRateAlerts => Set<FxRateAlert>();
    public DbSet<FxConversion> FxConversions => Set<FxConversion>();
    public DbSet<CreditCard> CreditCards => Set<CreditCard>();
    public DbSet<CreditCardInstallmentPlan> CreditCardInstallmentPlans => Set<CreditCardInstallmentPlan>();
    public DbSet<CreditCardTransaction> CreditCardTransactions => Set<CreditCardTransaction>();
    public DbSet<CreditCardStatement> CreditCardStatements => Set<CreditCardStatement>();
    public DbSet<CreditCardLimitIncreaseRequest> CreditCardLimitIncreaseRequests => Set<CreditCardLimitIncreaseRequest>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // --- User tablosu kuralları ---
        modelBuilder.Entity<User>(entity =>
        {
            entity.HasKey(u => u.Id);

            entity.Property(u => u.FullName).IsRequired().HasMaxLength(150);

            entity.Property(u => u.Email).IsRequired().HasMaxLength(256);
            entity.HasIndex(u => u.Email).IsUnique(); // aynı e-posta iki kez olamaz

            entity.Property(u => u.PasswordHash).IsRequired();

            // TC kimlik no kayıt sırasında alınır ve benzersizdir.
            entity.Property(u => u.NationalId).IsRequired().HasMaxLength(11);
            entity.HasIndex(u => u.NationalId).IsUnique();

            // enum'u veritabanında okunabilir metin olarak sakla ("Customer", "BranchManager"...)
            entity.Property(u => u.Role).HasConversion<string>().HasMaxLength(30);

            // Personel görev ili (opsiyonel; sadece personelde dolu)
            entity.Property(u => u.City).HasMaxLength(80);

            // Günlük internet havale limiti (opsiyonel; para hassasiyeti)
            entity.Property(u => u.DailyTransferLimit).HasPrecision(18, 2);

            // Personelin bağlı olduğu şube (opsiyonel). Şube silinince personel
            // silinmesin (Restrict) — personel verisi şubeden bağımsız korunur.
            entity.HasOne(u => u.Branch)
                .WithMany(b => b.Staff)
                .HasForeignKey(u => u.BranchId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        // --- Branch (şube) tablosu kuralları ---
        modelBuilder.Entity<Branch>(entity =>
        {
            entity.HasKey(b => b.Id);
            entity.Property(b => b.Code).IsRequired().HasMaxLength(20);
            entity.HasIndex(b => b.Code).IsUnique(); // şube kodu benzersiz
            entity.Property(b => b.Name).IsRequired().HasMaxLength(150);
            entity.Property(b => b.City).IsRequired().HasMaxLength(80);

            // İl bazlı sorgu (il müdürü kapsamı) için index
            entity.HasIndex(b => b.City);
        });

        // --- SavedRecipient (kayıtlı alıcı) tablosu kuralları ---
        modelBuilder.Entity<SavedRecipient>(entity =>
        {
            entity.HasKey(r => r.Id);
            entity.Property(r => r.Name).IsRequired().HasMaxLength(80);
            entity.Property(r => r.Iban).IsRequired().HasMaxLength(34);
            entity.Property(r => r.Note).HasMaxLength(50);

            entity.HasIndex(r => new { r.UserId, r.Iban }).IsUnique();

            entity.HasOne(r => r.User)
                .WithMany()
                .HasForeignKey(r => r.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // --- BillPayment (fatura ödeme) tablosu kuralları ---
        modelBuilder.Entity<BillPayment>(entity =>
        {
            entity.HasKey(b => b.Id);
            entity.Property(b => b.Category).HasConversion<string>().HasMaxLength(20);
            entity.Property(b => b.BillerCode).IsRequired().HasMaxLength(40);
            entity.Property(b => b.BillerName).IsRequired().HasMaxLength(60);
            entity.Property(b => b.SubscriberNo).IsRequired().HasMaxLength(20);
            entity.Property(b => b.Period).IsRequired().HasMaxLength(7); // "YYYY-MM"
            entity.Property(b => b.Amount).HasPrecision(18, 2);
            entity.Property(b => b.Channel).HasConversion<string>().HasMaxLength(10);

            entity.HasIndex(b => b.UserId);
            // Aynı (kurum + abone no + dönem) tek kez ödenir
            entity.HasIndex(b => new { b.BillerCode, b.SubscriberNo, b.Period }).IsUnique();

            entity.HasOne(b => b.User)
                .WithMany()
                .HasForeignKey(b => b.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // --- PaymentOrder (düzenli ödeme talimatı) tablosu kuralları ---
        modelBuilder.Entity<PaymentOrder>(entity =>
        {
            entity.HasKey(o => o.Id);
            entity.Property(o => o.Type).HasConversion<string>().HasMaxLength(20);
            entity.Property(o => o.Name).IsRequired().HasMaxLength(60);
            entity.Property(o => o.Category).HasConversion<string>().HasMaxLength(20);
            entity.Property(o => o.BillerCode).HasMaxLength(40);
            entity.Property(o => o.BillerName).HasMaxLength(60);
            entity.Property(o => o.SubscriberNo).HasMaxLength(20);
            entity.Property(o => o.TargetIban).HasMaxLength(34);
            entity.Property(o => o.TargetName).HasMaxLength(60);
            entity.Property(o => o.Amount).HasPrecision(18, 2);
            entity.Property(o => o.LastStatus).HasMaxLength(60);

            entity.HasIndex(o => o.UserId);
            // Arka plan çalıştırıcının vade sorgusu için
            entity.HasIndex(o => new { o.IsActive, o.NextRunDate });

            entity.HasOne(o => o.User)
                .WithMany()
                .HasForeignKey(o => o.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // --- TimeDeposit (vadeli mevduat) tablosu kuralları ---
        modelBuilder.Entity<TimeDeposit>(entity =>
        {
            entity.HasKey(d => d.Id);
            entity.Property(d => d.Principal).HasPrecision(18, 2);
            entity.Property(d => d.AnnualRate).HasPrecision(9, 4);
            entity.Property(d => d.GrossInterest).HasPrecision(18, 2);
            entity.Property(d => d.WithholdingTax).HasPrecision(18, 2);
            entity.Property(d => d.NetInterest).HasPrecision(18, 2);
            entity.Property(d => d.Status).HasConversion<string>().HasMaxLength(20);

            entity.HasIndex(d => d.UserId);
            // Arka plan vade sorgusu için
            entity.HasIndex(d => new { d.Status, d.MaturityDate });

            entity.HasOne(d => d.User)
                .WithMany()
                .HasForeignKey(d => d.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // --- ExchangeRate tablosu kuralları ---
        modelBuilder.Entity<ExchangeRate>(entity =>
        {
            entity.HasKey(r => r.Id);
            entity.Property(r => r.Currency).HasConversion<string>().HasMaxLength(3);
            entity.HasIndex(r => r.Currency).IsUnique(); // her birimden tek kur satırı
            entity.Property(r => r.BuyRate).HasPrecision(18, 4);
            entity.Property(r => r.SellRate).HasPrecision(18, 4);
            entity.Property(r => r.BaseMid).HasPrecision(18, 4);
        });

        // --- FxTrade tablosu kuralları ---
        modelBuilder.Entity<FxTrade>(entity =>
        {
            entity.HasKey(t => t.Id);
            entity.Property(t => t.Side).HasConversion<string>().HasMaxLength(10);
            entity.Property(t => t.Currency).HasConversion<string>().HasMaxLength(3);
            entity.Property(t => t.Amount).HasPrecision(18, 2);
            entity.Property(t => t.Rate).HasPrecision(18, 4);
            entity.Property(t => t.TryAmount).HasPrecision(18, 2);
            entity.Property(t => t.Channel).HasConversion<string>().HasMaxLength(10);

            entity.HasIndex(t => t.UserId);

            entity.HasOne(t => t.User)
                .WithMany()
                .HasForeignKey(t => t.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // --- FxRateAlert tablosu kuralları ---
        modelBuilder.Entity<FxRateAlert>(entity =>
        {
            entity.HasKey(a => a.Id);
            entity.Property(a => a.Currency).HasConversion<string>().HasMaxLength(3);
            entity.Property(a => a.Direction).HasConversion<string>().HasMaxLength(10);
            entity.Property(a => a.TargetRate).HasPrecision(18, 4);
            entity.Property(a => a.LastCheckedRate).HasPrecision(18, 4);

            entity.HasIndex(a => a.UserId);
            entity.HasIndex(a => new { a.IsActive, a.IsTriggered });

            entity.HasOne(a => a.User)
                .WithMany()
                .HasForeignKey(a => a.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // --- FxConversion tablosu kuralları ---
        modelBuilder.Entity<FxConversion>(entity =>
        {
            entity.HasKey(c => c.Id);
            entity.Property(c => c.FromCurrency).HasConversion<string>().HasMaxLength(3);
            entity.Property(c => c.ToCurrency).HasConversion<string>().HasMaxLength(3);
            entity.Property(c => c.FromAmount).HasPrecision(18, 2);
            entity.Property(c => c.ToAmount).HasPrecision(18, 2);
            entity.Property(c => c.TryAmount).HasPrecision(18, 2);
            entity.Property(c => c.FromRate).HasPrecision(18, 4);
            entity.Property(c => c.ToRate).HasPrecision(18, 4);
            entity.Property(c => c.Channel).HasConversion<string>().HasMaxLength(10);

            entity.HasIndex(c => c.UserId);

            entity.HasOne(c => c.User)
                .WithMany()
                .HasForeignKey(c => c.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // --- Account tablosu kuralları ---
        modelBuilder.Entity<Account>(entity =>
        {
            entity.HasKey(a => a.Id);

            entity.Property(a => a.Iban).IsRequired().HasMaxLength(34);
            entity.HasIndex(a => a.Iban).IsUnique(); // IBAN benzersiz

            entity.Property(a => a.AccountType).HasConversion<string>().HasMaxLength(20);

            entity.Property(a => a.Currency).HasConversion<string>().HasMaxLength(3);

            entity.Property(a => a.Balance).HasPrecision(18, 2); // para hassasiyeti

            entity.Property(a => a.Channel).HasConversion<string>().HasMaxLength(10);

            entity.Property(a => a.FreezeType).HasConversion<string>().HasMaxLength(10);

            // İlişki: Account -> User (çok hesap, tek kullanıcı).
            // Kullanıcı silinirse hesapları da silinir (Cascade).
            entity.HasOne(a => a.User)
                .WithMany(u => u.Accounts)
                .HasForeignKey(a => a.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // --- Transaction tablosu kuralları ---
        modelBuilder.Entity<Transaction>(entity =>
        {
            entity.HasKey(t => t.Id);

            entity.Property(t => t.Type).HasConversion<string>().HasMaxLength(20);
            entity.Property(t => t.Amount).HasPrecision(18, 2);
            entity.Property(t => t.Description).HasMaxLength(20);
            entity.Property(t => t.FromIban).HasMaxLength(34);
            entity.Property(t => t.ToIban).HasMaxLength(34);
            entity.Property(t => t.Channel).HasConversion<string>().HasMaxLength(10);

            // Geçmiş sorguları FromAccountId/ToAccountId üzerinden yapılır
            entity.HasIndex(t => t.FromAccountId);
            entity.HasIndex(t => t.ToAccountId);
        });

        // --- LoanApplication tablosu kuralları ---
        modelBuilder.Entity<LoanApplication>(entity =>
        {
            entity.HasKey(l => l.Id);
            entity.Property(l => l.NationalId).IsRequired().HasMaxLength(11);
            entity.Property(l => l.Profession).IsRequired().HasMaxLength(100);
            entity.Property(l => l.Income).HasPrecision(18, 2);
            entity.Property(l => l.MonthlyExpenses).HasPrecision(18, 2);
            entity.Property(l => l.Amount).HasPrecision(18, 2);
            entity.Property(l => l.MaxLimit).HasPrecision(18, 2);
            entity.Property(l => l.ExistingDebt).HasPrecision(18, 2);
            entity.Property(l => l.NetLimit).HasPrecision(18, 2);
            entity.Property(l => l.MonthlyInstallment).HasPrecision(18, 2);
            entity.Property(l => l.RemainingDebt).HasPrecision(18, 2);
            entity.Property(l => l.AiReason).HasMaxLength(1000);
            entity.Property(l => l.DecidedBy).HasMaxLength(40);
            entity.Property(l => l.DecisionNote).HasMaxLength(1000);
            entity.Property(l => l.MaritalStatus).HasConversion<string>().HasMaxLength(20);
            entity.Property(l => l.HousingStatus).HasConversion<string>().HasMaxLength(20);
            entity.Property(l => l.Status).HasConversion<string>().HasMaxLength(20);
            entity.Property(l => l.RecommendedStatus).HasConversion<string>().HasMaxLength(20);
            entity.Property(l => l.RequiredApproverRole).HasConversion<string>().HasMaxLength(30);
            entity.Property(l => l.Channel).HasConversion<string>().HasMaxLength(10);

            // Onay kuyruğu sorgusu (PendingApproval) için index
            entity.HasIndex(l => l.Status);

            entity.HasOne(l => l.User)
                .WithMany()
                .HasForeignKey(l => l.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // --- ReferenceCreditRecord (fake referans nüfus) kuralları ---
        modelBuilder.Entity<ReferenceCreditRecord>(entity =>
        {
            entity.HasKey(r => r.Id);
            entity.Property(r => r.MonthlyIncome).HasPrecision(18, 2);
            entity.Property(r => r.MonthlyExpenses).HasPrecision(18, 2);
            entity.Property(r => r.GrantedAmount).HasPrecision(18, 2);
            entity.Property(r => r.Profession).HasMaxLength(100);
            entity.Property(r => r.MaritalStatus).HasConversion<string>().HasMaxLength(20);
            entity.Property(r => r.HousingStatus).HasConversion<string>().HasMaxLength(20);

            // Gelir bandına göre benzer kayıt sorgusu için index
            entity.HasIndex(r => r.MonthlyIncome);
        });

        // --- ExternalBankLoan (fake diğer banka kredileri) kuralları ---
        modelBuilder.Entity<ExternalBankLoan>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.NationalId).IsRequired().HasMaxLength(11);
            entity.Property(e => e.BankName).IsRequired().HasMaxLength(100);
            entity.Property(e => e.OriginalAmount).HasPrecision(18, 2);
            entity.Property(e => e.RemainingDebt).HasPrecision(18, 2);
            entity.Property(e => e.MonthlyInstallment).HasPrecision(18, 2);

            // TC ile sorgu için index
            entity.HasIndex(e => e.NationalId);
        });

        // --- Payment tablosu kuralları ---
        modelBuilder.Entity<Payment>(entity =>
        {
            entity.HasKey(p => p.Id);
            entity.Property(p => p.MaskedCardNumber).IsRequired().HasMaxLength(25);
            entity.Property(p => p.Amount).HasPrecision(18, 2);
            entity.Property(p => p.Status).HasConversion<string>().HasMaxLength(20);
            entity.Property(p => p.Description).HasMaxLength(200);
            entity.Property(p => p.Channel).HasConversion<string>().HasMaxLength(10);

            entity.HasIndex(p => p.UserId);

            entity.HasOne(p => p.User)
                .WithMany()
                .HasForeignKey(p => p.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // --- Card tablosu kuralları ---
        modelBuilder.Entity<Card>(entity =>
        {
            entity.HasKey(c => c.Id);
            entity.Property(c => c.CardNumber).IsRequired().HasMaxLength(16);
            entity.HasIndex(c => c.CardNumber).IsUnique();
            entity.Property(c => c.Cvv).IsRequired().HasMaxLength(4);
            entity.Property(c => c.Status).HasConversion<string>().HasMaxLength(20);
            entity.Property(c => c.Channel).HasConversion<string>().HasMaxLength(10);
            // İnternet alışverişi varsayılan açık (mevcut kartlar da açık başlar)
            entity.Property(c => c.OnlineShoppingEnabled).HasDefaultValue(true);

            // Sahibi: kullanıcı silinince kartları da silinsin
            entity.HasOne(c => c.User)
                .WithMany()
                .HasForeignKey(c => c.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            // Bağlı hesap: çoklu cascade yolunu önlemek için Restrict
            entity.HasOne(c => c.Account)
                .WithMany()
                .HasForeignKey(c => c.AccountId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        // --- CreditCard (gerçek kredi kartı) tablosu kuralları ---
        modelBuilder.Entity<CreditCard>(entity =>
        {
            entity.HasKey(c => c.Id);
            entity.Property(c => c.CardNumber).IsRequired().HasMaxLength(16);
            entity.HasIndex(c => c.CardNumber).IsUnique();
            entity.Property(c => c.Cvv).IsRequired().HasMaxLength(4);
            entity.Property(c => c.Status).HasConversion<string>().HasMaxLength(20);
            entity.Property(c => c.CreditLimit).HasPrecision(18, 2);
            entity.Property(c => c.CurrentDebt).HasPrecision(18, 2);
            entity.Property(c => c.AiReason).HasMaxLength(1000);
            entity.Property(c => c.Channel).HasConversion<string>().HasMaxLength(10);
            entity.Property(c => c.OnlineShoppingEnabled).HasDefaultValue(true);

            entity.HasIndex(c => c.UserId);
            // Arka plan worker'ın kesim sorgusu için (aktif kartlarda vadesi gelen)
            entity.HasIndex(c => new { c.Status, c.NextStatementDate });

            entity.HasOne(c => c.User)
                .WithMany()
                .HasForeignKey(c => c.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // --- CreditCardInstallmentPlan tablosu kuralları ---
        modelBuilder.Entity<CreditCardInstallmentPlan>(entity =>
        {
            entity.HasKey(p => p.Id);
            entity.Property(p => p.TotalAmount).HasPrecision(18, 2);
            entity.Property(p => p.InstallmentAmount).HasPrecision(18, 2);
            entity.Property(p => p.Description).HasMaxLength(200);

            entity.HasIndex(p => p.CreditCardId);

            entity.HasOne(p => p.CreditCard)
                .WithMany()
                .HasForeignKey(p => p.CreditCardId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // --- CreditCardTransaction (kart hareketi / ekstre kalemi) kuralları ---
        modelBuilder.Entity<CreditCardTransaction>(entity =>
        {
            entity.HasKey(t => t.Id);
            entity.Property(t => t.Type).HasConversion<string>().HasMaxLength(20);
            entity.Property(t => t.Amount).HasPrecision(18, 2);
            entity.Property(t => t.Description).HasMaxLength(200);

            entity.HasIndex(t => t.CreditCardId);
            entity.HasIndex(t => t.StatementId);

            entity.HasOne(t => t.CreditCard)
                .WithMany()
                .HasForeignKey(t => t.CreditCardId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // --- CreditCardStatement (dönem ekstresi) tablosu kuralları ---
        modelBuilder.Entity<CreditCardStatement>(entity =>
        {
            entity.HasKey(s => s.Id);
            entity.Property(s => s.TotalDue).HasPrecision(18, 2);
            entity.Property(s => s.MinimumPayment).HasPrecision(18, 2);
            entity.Property(s => s.PaidAmount).HasPrecision(18, 2);
            entity.Property(s => s.RemainingAmount).HasPrecision(18, 2);
            entity.Property(s => s.TotalInterestApplied).HasPrecision(18, 2);
            entity.Property(s => s.Status).HasConversion<string>().HasMaxLength(20);

            entity.HasIndex(s => new { s.CreditCardId, s.Status });
            entity.HasIndex(s => new { s.Status, s.DueDate, s.LastInterestAppliedAt });

            entity.HasOne(s => s.CreditCard)
                .WithMany()
                .HasForeignKey(s => s.CreditCardId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // --- CreditCardLimitIncreaseRequest tablosu kuralları ---
        modelBuilder.Entity<CreditCardLimitIncreaseRequest>(entity =>
        {
            entity.HasKey(r => r.Id);
            entity.Property(r => r.CurrentLimit).HasPrecision(18, 2);
            entity.Property(r => r.RequestedLimit).HasPrecision(18, 2);
            entity.Property(r => r.RecommendedLimit).HasPrecision(18, 2);
            entity.Property(r => r.MaritalStatus).HasConversion<string>().HasMaxLength(20);
            entity.Property(r => r.HousingStatus).HasConversion<string>().HasMaxLength(20);
            entity.Property(r => r.Income).HasPrecision(18, 2);
            entity.Property(r => r.MonthlyExpenses).HasPrecision(18, 2);
            entity.Property(r => r.Profession).IsRequired().HasMaxLength(100);
            entity.Property(r => r.Status).HasConversion<string>().HasMaxLength(20);
            entity.Property(r => r.AiReason).HasMaxLength(1000);
            entity.Property(r => r.Channel).HasConversion<string>().HasMaxLength(10);

            entity.HasIndex(r => r.CreditCardId);
            entity.HasIndex(r => new { r.Status, r.CreatedAt });

            entity.HasOne(r => r.CreditCard)
                .WithMany()
                .HasForeignKey(r => r.CreditCardId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(r => r.User)
                .WithMany()
                .HasForeignKey(r => r.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // --- PendingTransfer tablosu kuralları ---
        modelBuilder.Entity<PendingTransfer>(entity =>
        {
            entity.HasKey(t => t.Id);
            entity.Property(t => t.Amount).HasPrecision(18, 2);
            entity.Property(t => t.FromIban).IsRequired().HasMaxLength(34);
            entity.Property(t => t.ToIban).IsRequired().HasMaxLength(34);
            entity.Property(t => t.Description).HasMaxLength(200);
            entity.Property(t => t.DecisionNote).HasMaxLength(1000);
            entity.Property(t => t.Status).HasConversion<string>().HasMaxLength(20);
            entity.HasIndex(t => t.Status); // onay kuyruğu sorgusu

            // Müşteri: silinince bekleyen havaleleri de silinsin
            entity.HasOne(t => t.Customer)
                .WithMany()
                .HasForeignKey(t => t.CustomerUserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // --- AuditLog tablosu kuralları ---
        modelBuilder.Entity<AuditLog>(entity =>
        {
            entity.HasKey(a => a.Id);
            entity.Property(a => a.ActorRole).HasMaxLength(30);
            entity.Property(a => a.Action).HasMaxLength(60);
            entity.Property(a => a.Detail).HasMaxLength(500);
            entity.HasIndex(a => a.CreatedAt);

            entity.HasOne(a => a.Actor)
                .WithMany()
                .HasForeignKey(a => a.ActorUserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // --- Notification tablosu kuralları ---
        modelBuilder.Entity<Notification>(entity =>
        {
            entity.HasKey(n => n.Id);
            entity.Property(n => n.Title).IsRequired().HasMaxLength(120);
            entity.Property(n => n.Body).HasMaxLength(500);
            entity.HasIndex(n => n.UserId);
        });
    }
}
