# AGENTS.md — Backend (.NET 8 / Clean Architecture)

Read the root [`../AGENTS.md`](../AGENTS.md) first. This file defines
backend-specific standards.

## Layers & Dependency Direction
```
API  ──►  Application  ──►  Domain
                 ▲
Infrastructure ──┘   (Infrastructure ──► Application, Domain)
```
- **Domain:** Entities + enums. Depends on NOTHING. No data annotations; plain
  POCOs. EF configuration lives in Infrastructure.
- **Application:** Business logic (services), DTOs, **interfaces** (repositories &
  services), validation. Never depends on concrete tech (EF, JWT) — always via
  interfaces.
- **Infrastructure:** EF Core, repository implementations, JWT generation, BCrypt,
  seeding. Implements the interfaces defined in Application.
- **API:** Controllers, middleware, `Program.cs`. Kept thin; contains no business
  logic.

> Dependencies never point inward incorrectly. Domain/Application don't know about
> Infrastructure.

## How to Add a Module/Feature (the pattern)
Reference an existing module (e.g. `Features/Loans`, `Features/Cards`) and follow
the same order:
1. **Domain:** Entity (`Domain/Entities`) + enum if needed (`Domain/Enums`).
2. **AppDbContext:** add `DbSet` + configure in `OnModelCreating`; then
   `dotnet ef migrations add <Name>` + `database update`.
3. **Application:**
   - DTOs (`Features/<X>/Dtos`) — as **`record`** types.
   - Repository interface (`Common/Interfaces/I<X>Repository.cs`).
   - Service interface + implementation (`Features/<X>/I<X>Service.cs`, `<X>Service.cs`).
   - FluentValidation validator (`Features/<X>/Validators`).
4. **Infrastructure:** Repository implementation (`Persistence/Repositories`).
5. **DI:** register in `Application/DependencyInjection.cs` (service + validator)
   and `Infrastructure/DependencyInjection.cs` (repository).
6. **API:** Controller (`Controllers/<X>Controller.cs`).

## Required Conventions
- **Response wrapper:** Every endpoint returns `ApiResponse<T>`
  (`ApiResponse<T>.SuccessResponse(data, msg)` / `.Fail(msg, errors)`). Never
  return an entity directly — always a **DTO**.
- **Mapping:** Manual. Use `private static Map(...)` methods in services.
  (The AutoMapper package is installed but NOT used — write manual mapping in new
  code too.)
- **Errors:** `throw` custom exceptions; NO try-catch in controllers (the global
  `ExceptionHandlingMiddleware` handles them):
  - `ValidationException(List<string>)` → 400 + errors (from FluentValidation)
  - `NotFoundException` → 404
  - `BusinessException` → 400 (business rules: insufficient balance, closed account, etc.)
  - Name clash: if our `ValidationException` collides with
    `FluentValidation.ValidationException`, use the full name
    (`Common.Exceptions.ValidationException`).
- **Validation:** Format/required rules via FluentValidation; call `ValidateAsync`
  at the start of the service and throw `ValidationException` if it fails.
  "Correctness" checks (e.g. is the card approved, is the balance enough) are
  business logic → `BusinessException`.
- **Auth:** `[Authorize]` on protected endpoints; `[Authorize(Roles = "Admin")]`
  for admin. Get the current user's id via **`ICurrentUserService.UserId`** (reads
  from the claim).
- **Ownership check:** When accessing a resource, verify
  `entity.UserId == currentUser.UserId`; otherwise throw `NotFoundException`
  (don't leak existence).
- **Atomicity:** Multiple changes (e.g. balance + a transaction record) are written
  by modifying tracked entities in the same DbContext and a **single
  `SaveChanges`**. Money movements must be atomic.
- **Enums:** stored as **strings** in the database (`HasConversion<string>()`).
- **Keys:** `Guid` PK. Money: `decimal` + `HasPrecision(18,2)`. Dates: UTC.

## Package Version Policy
- **Stay aligned with .NET 8 LTS.** EF Core / Npgsql / JwtBearer = **8.0.x**.
- AutoMapper's .NET 8-compatible older versions carry a security advisory; since
  this project uses manual mapping, don't touch AutoMapper. When adding new
  packages, verify .NET 8 compatibility (watch for NU1605 downgrade errors).

## Commands
```bash
# Run (Swagger: http://localhost:5099/swagger)
dotnet run --project TurkcellBank.API --urls "http://localhost:5099"
# Migrations
dotnet ef migrations add <Name> --project TurkcellBank.Infrastructure --startup-project TurkcellBank.API
dotnet ef database update       --project TurkcellBank.Infrastructure --startup-project TurkcellBank.API
# Secrets (dev)
dotnet user-secrets set "Jwt:Key" "<...>" --project TurkcellBank.API
```
