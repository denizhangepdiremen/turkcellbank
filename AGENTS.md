# AGENTS.md — TurkcellBank

This file defines the standards that AI assistants (and developers) must follow
when writing code in this project. Before writing code, read this file and the
relevant subdirectory file:

- Backend: [`backend/AGENTS.md`](backend/AGENTS.md)
- Frontend: [`frontend/AGENTS.md`](frontend/AGENTS.md)

---

## Project Overview
TurkcellBank — a digital banking platform (educational/internship project). Monorepo:

```
TurkcellBank/
├── backend/    # .NET 8 Web API (Clean Architecture) + PostgreSQL
└── frontend/   # React 19 + TypeScript + Vite
```

Modules: Auth/profile, Accounts, Money transfer, **Loans (AI-driven automatic
decision)**, Virtual POS, Bank cards, Admin panel (RBAC).

## Tech Stack
- **Backend:** .NET 8, EF Core 8 + Npgsql (PostgreSQL), JWT + BCrypt,
  FluentValidation, Swagger, Google Gemini (AI Studio) for loan evaluation
- **Frontend:** React 19, TypeScript, Vite, React Router, TanStack Query, Axios,
  React Hook Form + Zod, Tailwind CSS, Storybook

---

## Conventions Shared Across the Whole Project

### Language
- **All user-facing text is Turkish** (error messages, labels, toasts).
- **Code comments are Turkish.** Identifiers (variables/classes/functions) are
  English and idiomatic.

### Security / Secrets
- **Never** put secrets (JWT key, passwords, real connection strings) in code or
  `appsettings.json`. Use **.NET user-secrets** in development and **environment
  variables** in production.
- Passwords are always hashed with **BCrypt**; never stored or logged in plain text.

### Git / Commits
- Commit messages: `feat:` / `fix:` / `chore:` / `refactor:` / `docs:` prefix +
  a short **Turkish** description.
- End the commit body with a `Co-Authored-By: ...` line (for assistant commits).
- Small, logical commits. Push at the end of the day.

### Money & Dates (general)
- Money: `decimal`, stored as `numeric(18,2)`. On the frontend use
  `Intl.NumberFormat('tr-TR', { currency: 'TRY' })`.
- Dates are **UTC** (`DateTime.UtcNow`).

### External AI / Integrations
- External providers (e.g. Gemini) live **behind an Application-layer interface**
  (`ILoanAiEvaluator`); the HTTP implementation is in Infrastructure. Always keep
  a **deterministic fallback** (`RuleBasedLoanAiEvaluator`) so the app works
  offline / without a key, and tests stay reproducible.
- Provider keys (`Gemini:ApiKey`) are secrets → user-secrets / env, never in code.
- The loan flow is **synchronous & automatic**: AI estimates a max limit; the
  service deterministically subtracts existing debt and decides approve/reject.
  Manual admin loan approve/reject is **kept but disabled** (future tier-based
  approval hierarchy).

### Working Method
- Advance large changes step by step, with user approval.
- **Mimic existing patterns** — when adding a new module, follow the file
  structure and flow of an existing module (e.g. Loans, Cards) exactly.
