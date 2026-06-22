# AGENTS.md — Frontend (React 19 / TypeScript / Vite)

Read the root [`../AGENTS.md`](../AGENTS.md) first. This file defines
frontend-specific standards.

## Folder Structure
```
src/
├── components/   # Reusable UI (Tailwind + cva, with Storybook stories)
├── pages/        # Screens (Login, Dashboard, Admin, ...) — each with its own .css
├── api/          # API service layer (axios calls, one file per backend module)
├── context/      # AuthContext (session)
├── routes/       # ProtectedRoute (role-protected) + GuestRoute (guest-only)
└── lib/          # apiClient, types, validation (zod), helpers
```

## Styling Convention (IMPORTANT)
- **Reusable components** (`components/`): written with **Tailwind CSS** +
  `class-variance-authority (cva)` (shadcn/ui-style `cn()` helper). Each component
  has a Storybook story.
- **Page-level layout** (`pages/`): use **semantic CSS class names** + a separate
  `.css` file (e.g. `dashboard-header`, `login-card`). Don't pile Tailwind
  utilities in pages; use readable class names.
- Color palette: **Indigo** (primary `indigo-600`; use the `destructive`/`rose`
  variant for red). Money: `Intl.NumberFormat('tr-TR', { currency: 'TRY' })`.

## Data Fetching & Mutations
- Use **TanStack Query**: `useQuery` for reads, `useMutation` for writes.
- After a mutation, refresh related queries with
  `queryClient.invalidateQueries({ queryKey: [...] })` (don't hand-update state).
- `onSuccess` → `toast.success(...)`, `onError` → `toast.error(getApiErrorMessage(err, '...'))`.

## Forms
- **React Hook Form + Zod** (`@hookform/resolvers/zod`). Schemas in `lib/validation.ts`.
- Spread `{...register('field')}` onto inputs; errors: `error={errors.field?.message}`.
- Controlled `useState` is acceptable for short modal forms with one or two fields,
  but the main auth forms use RHF + Zod.

## API Layer
- `lib/apiClient.ts`: single axios instance + interceptor (attaches JWT, redirects
  to login on **401**). Make new requests through it.
- `api/*.ts`: one service file per backend module; each function returns
  `ApiResponse<T>`.
- `lib/types.ts`: **camelCase** TS counterparts of the backend DTOs. Update this
  when the backend changes a field.

## Session & Authorization
- `useAuth()` (AuthContext): `user`, `login`, `logout`, `updateUser`. Token in
  `localStorage`.
- Protected page: `<ProtectedRoute>`; if a role is required,
  `<ProtectedRoute requiredRole="Admin">`.
- Auth pages (login/register/forgot) are wrapped in `<GuestRoute>` (logged-in users
  are redirected to their panel). Auth transitions use
  `navigate(..., { replace: true })` so back/forward can't reach the wrong page.

## UX Standards
- Feedback: **toast** (react-hot-toast). Don't leave success/failure silent.
- Irreversible actions (closing an account, rejecting, refunding): confirm with
  **`ConfirmDialog`**.
- While lists/tables load: use **`Skeleton`** (not a Spinner).
- If lists can grow: "Daha fazla göster" (client-side pagination).
- **Responsive is required:** must work on mobile/narrow screens (account cards max
  2 columns, 1 on mobile; tables scroll horizontally). Test mobile + desktop.
- Every page calls `usePageTitle('...')`.
- The dashboard is **tabbed**: one section per tab (Hesaplarım / İşlemler / Krediler /
  Kartlar / Ödemeler); users can add/remove tabs (pref saved in `localStorage`).
  New sections go behind a tab — don't append to one long scroll.
- A global `Footer` (mounted in `App.tsx`) renders on every page.
- Loan apply flow: a "değerlendiriliyor" waiting modal → result modal (approve/reject
  + AI reason); the decision is **automatic** (no admin approval step).

## Commands
```bash
npm run dev        # http://localhost:5173 (backend must run on 5099)
npm run build      # tsc -b && vite build  (must pass with no errors before commit)
npm run storybook  # component library
```
> `tsconfig` has `noUnusedLocals`/`noUnusedParameters` enabled — unused
> imports/variables break the build; keep it clean.
