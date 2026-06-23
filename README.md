# 🏦 TurkcellBank

Yeni nesil, dijital odaklı bir bankacılık platformu. Müşteriler hesap açabilir,
para transferi yapabilir, kredi başvurusunda bulunabilir ve sanal POS ile ödeme
yapabilir; adminler ise başvuruları yönetip işlemleri denetleyebilir.

> Turkcell staj projesi olarak, yapay zeka destekli geliştirme ile sıfırdan
> üretilmiştir. Eğitim/demonstrasyon amaçlıdır — bazı akışlar (ödeme, 3D Secure)
> simülasyondur.

---

## ✨ Özellikler

- **Kimlik Doğrulama:** Kayıt, giriş, JWT tabanlı oturum, profil güncelleme
- **Rol Bazlı Yetkilendirme (RBAC):** Müşteri, Admin (teknik) + banka hiyerarşisi: **Şube Çalışanı, Şube Müdürü, İl Müdürü, Direktör**
- **Banka Organizasyonu & Onay Hiyerarşisi:** Gerçek şube yapısı (il/şube/personel); krediler tutar bandına göre otomatik veya yetkili onayına düşer; her yönetici bir alt kademeyi görür (detay aşağıda)
- **Şube İşlemleri (adına işlem):** Şube çalışanı, masaya gelen müşteriyi TC/e-posta ile bulup **onun adına** hesap açar, para yatırır, havale/kredi/kart başvurusu yapar; her kayıt **Şube kanalı + çalışan damgası** taşır
- **Hesap Yönetimi:** Hesap açma (otomatik **geçerli IBAN** — ISO 13616 mod-97), listeleme, kapatma
- **Para Transferi:** Para yatırma, banka içi havale (bakiye kontrolü, atomik), işlem geçmişi. Güvenlik: **250k₺ üstü internette bloklu** (şubeye yönlendirilir), **1M₺ üstü şube müdürü onayı** (maker-checker)
- **AI Destekli Kredi:** Genişletilmiş başvuru (TC kimlik, demografi, gelir/gider); başvuran 30.000 kişilik referans nüfusla karşılaştırılır, yapay zeka (Gemini) maksimum limiti tahmin eder, diğer banka + bizim banka borçları düşülerek karar üretilir. **10M₺ altı otomatik**, üstü tutar bandına göre yetkili onayına düşer (detay aşağıda)
- **Sanal POS:** Kartla ödeme, 3D Secure simülasyonu, ödeme geçmişi, iade (admin), fraud kontrolü. Kart başvuruları **şube müdürü** tarafından onaylanır
- **Bildirimler:** Yetkili bir kredi/havale/kart kararı verince müşteriye panel içi bildirim düşer
- **Denetim Kaydı (Audit Log):** Onay/red kararları, şube adına işlemler ve yüksek havaleler kaydedilir; admin/direktör görüntüler
- **Kişiselleştirilebilir Panel:** Sekmeli arayüz (Hesap / İşlem / Kredi / Kart / Ödeme); kullanıcı görmek istediği sekmeleri ekleyip çıkarabilir (tercih tarayıcıda kalıcı). Her rol kendi paneline yönlenir
- **Admin Paneli (teknik):** Kullanıcı listesi, ödeme iade, denetim kaydı; kredi ve kart tabloları salt-okunur (onay yetkisi banka hiyerarşisindedir)
- **Hız Sınırlama (Rate Limiting):** Brute-force koruması — `login`/`register` IP başına sıkı, tüm uçlar için gevşek global limit; aşımda `429` + `Retry-After`
- **Tutarlı API:** Tek tip response wrapper + global exception middleware + Swagger (JWT'li)

---

## 🛠️ Teknoloji Stack'i

**Backend**
- .NET 8, ASP.NET Core Web API
- Clean Architecture (API / Application / Domain / Infrastructure)
- Entity Framework Core 8 + PostgreSQL (Npgsql)
- JWT (Bearer) kimlik doğrulama, BCrypt şifre hashleme
- FluentValidation, Swagger / OpenAPI
- Yapay zeka: Google Gemini (AI Studio) — `ILoanAiEvaluator` ile soyutlanmış, kural-motoru fallback'li

**Frontend**
- React 19 + TypeScript + Vite
- React Router, TanStack Query, Axios
- React Hook Form + Zod (form doğrulama)
- Tailwind CSS, Storybook (komponent kütüphanesi)

---

## 🏛️ Mimari (Clean Architecture)

Bağımlılıklar hep **içe** akar; çekirdek (Domain) hiçbir şeye bağımlı değildir.

```
API  ──►  Application  ──►  Domain
                 ▲
Infrastructure ──┘   (Infrastructure ──► Application)
```

| Katman | Sorumluluk |
|--------|------------|
| **Domain** | Entity'ler ve enum'lar (saf çekirdek) |
| **Application** | İş mantığı, servisler, DTO'lar, arayüzler, validation |
| **Infrastructure** | EF Core, PostgreSQL, JWT üretimi, repository'ler |
| **API** | Controller'lar, HTTP, Swagger, middleware |

---

## 🤖 AI Destekli Kredi Değerlendirme

Kredi başvurusu, manuel admin onayı yerine **başvuru anında otomatik** karara bağlanır:

1. **Genişletilmiş form:** TC kimlik (algoritma doğrulamalı), yaş, medeni hal, çocuk sayısı, konut durumu, aylık gelir/gider, çalışma kıdemi.
2. **Benzer profil eşleştirme:** 30.000 kayıtlık fake referans nüfustan, başvurana **gelir + gider + yaş + konut + medeni hal + çocuk** benzerliğine göre (ağırlıklı uzaklık) en yakın **50** kişi seçilir.
3. **Yapay zeka tahmini:** Bu kohortun özeti (temerrüt oranı, ortalama kredi/gelir katsayısı) + 50 örnek **Gemini**'ye verilir; model **maksimum kredi limitini** ve gerekçesini döner.
4. **Borç düşümü:** TC ile sorgulanan diğer banka kredileri + bankamızdaki aktif krediler limitten düşülür → **net limit**.
5. **Karar:** Talep ≤ net limit ise **onay** + ödeme planı; değilse **red** (kullanılabilir limit belirtilir). Sonuç, kullanıcıya gerekçesiyle bir modalda gösterilir ve "Kredilerim"de saklanır.

**Sağlayıcı bağımsız:** Değerlendirme `ILoanAiEvaluator` arayüzünün arkasındadır. `Gemini:ApiKey` yapılandırılmışsa **Gemini** (`gemini-2.5-flash`) kullanılır; key yoksa veya hata/zaman aşımı olursa **deterministik kural motoruna** (offline; testler için) düşülür. Böylece uygulama AI olmadan da tam çalışır.

---

## 🏢 Banka Organizasyonu ve Onay Hiyerarşisi

Sisteme gerçek bir banka organizasyonu eklenmiştir: **3 il × 3 şube = 9 şube**, her
şubede çalışan + şube müdürü, her ilde il müdürü, tepede direktör. Admin yalnızca
**teknik** roldür (kullanıcı/denetim yönetimi), bankacılık onaylarında yeri yoktur.

### Roller
| Rol | Yetki |
|-----|-------|
| **Müşteri** | Kendi hesap/kredi/kart/ödeme işlemleri |
| **Şube Çalışanı** | Müşteri **adına** işlem (hesap/havale/kredi/kart) — kendisi onay veremez |
| **Şube Müdürü** | 10M–50M kredi, >1M havale, kart onayları; şubesini görür |
| **İl Müdürü** | 50M–100M kredi onayı; ilindeki şube müdürlerini görür |
| **Direktör** | 100M üstü kredi onayı; tüm bankayı görür |
| **Admin** | Teknik: kullanıcı listesi, ödeme iade, denetim kaydı |

### Tutar bazlı kredi onayı (tek onaycı)
`≤10M` → AI/kural motoru **otomatik** · `10–50M` → **şube müdürü** · `50–100M` →
**il müdürü** · `>100M` → **direktör**. Eşikler `appsettings.json > Loan`'dan okunur.
AI raporu üst bantlarda **danışma** niteliğindedir; yetkili kararı verir (gerekçe
notuyla, AI önerisini ezebilir). Görev ayrılığı: işlemi başlatan onaylayamaz.

### Adına işlem + kanal
Şube çalışanı müşteriyi bulup onun adına işlem yapar; mevcut servisler bir **işlem
bağlamı** (`IOperationContext`) ile yeniden kullanılır. Her kayıt **kanal**
(İnternet/Şube) + **çalışan damgası** taşır; müşteri geçmişinde "Şube" etiketiyle görünür.

### Havale güvenliği
`>250k₺` internette bloklu → şubeye yönlendirilir. `>1M₺` (şubeden) → **şube müdürü
onayı** (maker-checker): havale hemen gerçekleşmez, onaylanınca para taşınır.
Eşikler `appsettings.json > Transfer`'dan okunur.

### Bildirim & denetim
Bir yetkili kredi/havale/kart kararı verince ilgili müşteriye **bildirim** düşer
(panelde zil). Tüm önemli aksiyonlar (onaylar, adına işlemler, yüksek havaleler)
**denetim kaydına** yazılır; admin/direktör görüntüler.

> Demo personel girişleri seed'lenir; şifre `appsettings`/secrets'taki
> `StaffSeed:Password` ile belirlenir (yoksa personel seed'i atlanır).

---

## 🚀 Kurulum

### Gereksinimler
- [.NET 8 SDK](https://dotnet.microsoft.com/download)
- [Node.js 18+](https://nodejs.org/)
- [PostgreSQL 16](https://www.postgresql.org/)

### 1. Veritabanı
```bash
createdb turkcellbank
```

### 2. Backend
```bash
cd backend/TurkcellBank.API

# Sırları ayarla (repoya girmez — .NET user-secrets)
dotnet user-secrets init
dotnet user-secrets set "Jwt:Key" "<en-az-32-karakterlik-gizli-anahtar>"
dotnet user-secrets set "AdminSeed:Password" "<admin-sifresi>"

# (Opsiyonel) AI kredi değerlendirmesi için Gemini key.
# Yoksa kural motoru kullanılır — uygulama yine tam çalışır.
dotnet user-secrets set "Gemini:ApiKey" "<google-ai-studio-api-key>"

# Veritabanı şemasını oluştur ve çalıştır
# (İlk açılışta 30.000 fake referans kaydı + diğer banka verileri seed edilir)
dotnet ef database update
dotnet run --urls "http://localhost:5099"
```
- API: `http://localhost:5099`
- Swagger: `http://localhost:5099/swagger`

> Bağlantı dizesi `appsettings.json`'da (`DefaultConnection`). Farklı kullanıcı/şifre
> için orayı düzenleyin.

### 3. Frontend
```bash
cd frontend
npm install
npm run dev      # http://localhost:5173
```
Storybook (komponent kütüphanesi): `npm run storybook`

---

## 🔑 Yapılandırma & Sırlar

| Anahtar | Nerede | Açıklama |
|---------|--------|----------|
| `Jwt:Key` | user-secrets (dev) / env var (prod) | JWT imzalama anahtarı (≥32 karakter) |
| `AdminSeed:Password` | user-secrets (dev) / env var (prod) | İlk admin şifresi |
| `AdminSeed:Email` | `appsettings.json` | İlk admin e-postası (varsayılan `admin@turkcellbank.com`) |
| `StaffSeed:Password` | user-secrets (dev) / env var (prod) | Personel (şube/il müdürü/direktör) seed şifresi; yoksa personel seed'i atlanır |
| `Gemini:ApiKey` | user-secrets (dev) / env var (prod) | **Opsiyonel** Google AI Studio API key; yoksa kural motoru devreye girer |
| `Gemini:Model` | `appsettings.json` (ops.) | Gemini modeli (varsayılan `gemini-2.5-flash`) |
| `Loan:*` | `appsettings.json` | Kredi onay eşikleri (AutoDecisionLimit 10M, BranchManagerLimit 50M, ProvincialManagerLimit 100M) |
| `Transfer:*` | `appsettings.json` | Havale eşikleri (InternetLimit 250k, BranchManagerApprovalLimit 1M) |
| `RateLimit:*` | `appsettings.json` | Hız sınırlama (prod: login 5/dk, register 3/dk, global 100/dk · IP) — Development'ta gevşek |
| `ConnectionStrings:DefaultConnection` | `appsettings.json` | PostgreSQL bağlantısı |

Uygulama ilk açılışta, sistemde admin yoksa yukarıdaki bilgilerle bir **admin
kullanıcısı** oluşturur. Production'da değerler **environment variable** ile sağlanır
(.NET katmanlı yapılandırma sayesinde ek koda gerek yoktur).

> ⚠️ Repo geçmişindeki eski örnek değerler yalnızca **geliştirme amaçlıdır** ve
> production'da kullanılmaz.

### Hız sınırlamayı (429) denemek
Development'ta limitler bilerek gevşektir (E2E suite'i tetiklemesin). Sıkı davranışı
görmek için backend'i düşük bir limitle başlatıp ardışık istek atın:
```bash
RateLimit__Auth__PermitLimit=5 dotnet run --project TurkcellBank.API --urls "http://localhost:5099"
# başka terminalde:
for i in $(seq 1 7); do curl -s -o /dev/null -w "%{http_code}\n" -X POST \
  localhost:5099/api/auth/login -H "Content-Type: application/json" \
  -d '{"email":"x@x.com","password":"y"}'; done   # 6. istekten itibaren 429
```

---

## 📡 Başlıca API Uç Noktaları

| Yöntem | Yol | Açıklama |
|--------|-----|----------|
| POST | `/api/auth/register` · `/login` | Kayıt / giriş |
| GET/PUT | `/api/auth/me` · `/profile` | Profil |
| GET/POST | `/api/accounts` | Hesaplar (aç/listele) |
| POST | `/api/transactions/deposit` · `/transfer` | Para yatırma / transfer |
| POST/GET | `/api/loans` | Kredi başvurusu (≤10M otomatik, üstü onaya) / kredilerim |
| POST/GET | `/api/payments` | Sanal POS ödeme / geçmiş |
| GET/POST | `/api/branch/*` | Şube çalışanı: müşteri arama + adına işlem (ŞubeÇalışanı rolü) |
| GET/POST | `/api/approvals/*` | Yetkili onay kuyrukları: kredi/havale/kart (müdür rolleri) |
| GET | `/api/org/team` | Yönetici organizasyon görünümü (müdür rolleri) |
| GET | `/api/audit` | Denetim kaydı (Admin/Direktör) |
| GET/POST | `/api/notifications` | Müşteri bildirimleri / okundu işaretle |
| GET/POST | `/api/admin/*` | Admin (teknik): kullanıcı listesi, ödeme iade (Admin rolü) |

Tüm uç noktalar Swagger'da belgelidir.

---

## 📁 Proje Yapısı

```
TurkcellBank/
├── backend/
│   ├── TurkcellBank.API/            # Controller'lar, Program.cs, middleware
│   ├── TurkcellBank.Application/     # İş mantığı, DTO, validation, arayüzler
│   ├── TurkcellBank.Domain/         # Entity'ler, enum'lar
│   └── TurkcellBank.Infrastructure/ # EF Core, repository, JWT, seed
└── frontend/
    └── src/
        ├── components/   # Yeniden kullanılabilir UI (Storybook)
        ├── pages/        # Login, Register, Dashboard, Admin...
        ├── api/          # API servis katmanı
        ├── context/      # AuthContext
        └── lib/          # axios, tipler, yardımcılar
```

---

## 📝 Notlar
- Sanal POS ödemeleri kart simülasyonudur; banka hesabı bakiyesini etkilemez.
- Geçerli test kartı: `1234 5678 9012 3456`, 3D Secure kodu: `123456`.
- Kredi değerlendirmesi **fake** referans veriye dayanır (gerçek kişi değildir); demo için geçerli bir TC kimlik no örneği: `12345678950`.
- Proje eğitim amaçlıdır; gerçek finansal işlem içermez.
