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
- **Rol Bazlı Yetkilendirme (RBAC):** Müşteri / Admin rolleri
- **Hesap Yönetimi:** Hesap açma (otomatik **geçerli IBAN** — ISO 13616 mod-97), listeleme, kapatma
- **Para Transferi:** Para yatırma, banka içi havale (bakiye kontrolü, atomik), işlem geçmişi
- **Kredi:** Başvuru + otomatik risk skorlama, admin onay/red, ödeme planı (taksitler)
- **Sanal POS:** Kartla ödeme, 3D Secure simülasyonu, ödeme geçmişi, iade (admin), fraud kontrolü
- **Admin Paneli:** Kullanıcı, kredi ve ödeme yönetimi
- **Tutarlı API:** Tek tip response wrapper + global exception middleware + Swagger (JWT'li)

---

## 🛠️ Teknoloji Stack'i

**Backend**
- .NET 8, ASP.NET Core Web API
- Clean Architecture (API / Application / Domain / Infrastructure)
- Entity Framework Core 8 + PostgreSQL (Npgsql)
- JWT (Bearer) kimlik doğrulama, BCrypt şifre hashleme
- FluentValidation, Swagger / OpenAPI

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

# Veritabanı şemasını oluştur ve çalıştır
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
| `ConnectionStrings:DefaultConnection` | `appsettings.json` | PostgreSQL bağlantısı |

Uygulama ilk açılışta, sistemde admin yoksa yukarıdaki bilgilerle bir **admin
kullanıcısı** oluşturur. Production'da değerler **environment variable** ile sağlanır
(.NET katmanlı yapılandırma sayesinde ek koda gerek yoktur).

> ⚠️ Repo geçmişindeki eski örnek değerler yalnızca **geliştirme amaçlıdır** ve
> production'da kullanılmaz.

---

## 📡 Başlıca API Uç Noktaları

| Yöntem | Yol | Açıklama |
|--------|-----|----------|
| POST | `/api/auth/register` · `/login` | Kayıt / giriş |
| GET/PUT | `/api/auth/me` · `/profile` | Profil |
| GET/POST | `/api/accounts` | Hesaplar (aç/listele) |
| POST | `/api/transactions/deposit` · `/transfer` | Para yatırma / transfer |
| POST/GET | `/api/loans` | Kredi başvurusu / kredilerim |
| POST/GET | `/api/payments` | Sanal POS ödeme / geçmiş |
| GET/POST | `/api/admin/*` | Admin: kullanıcı, kredi onay/red, ödeme iade (Admin rolü) |

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
- Proje eğitim amaçlıdır; gerçek finansal işlem içermez.
