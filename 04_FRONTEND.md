# 04 — Frontend Guide (Next.js + Tailwind + shadcn/ui)

Read `05_SECURITY.md` first. This doc says HOW to write frontend code.

## 1. Stack
| Concern | Choice |
|---|---|
| Language | TypeScript (strict) |
| Framework | Next.js (App Router), deployed on Cloudflare via the OpenNext adapter. Fallback: static export for pages that don't need SSR |
| Styling | Tailwind CSS + shadcn/ui (Radix primitives) |
| Server state | TanStack Query |
| Forms | react-hook-form + Zod resolver (schemas from `packages/shared`) |
| API client | Typed client generated from the backend OpenAPI spec |
| i18n | next-intl (English first; Hindi/Bengali-ready) |
| Icons | lucide-react |
| Testing | Vitest + Testing Library, Playwright for critical flows |
| Lint/format | ESLint (shared config), Prettier |

If a Cloudflare runtime limitation blocks a Next.js feature, tell the human and propose the smallest workaround. Do not silently change the hosting approach.

## 2. Folder structure
```
apps/web/src/
  app/                       # routes (App Router)
    (public)/                # landing, factory public profiles, login
    (brand)/                 # brand dashboard, briefs, quotes, orders
    (factory)/               # factory dashboard, quote requests, profile
    (admin)/                 # verification, matching, orders, audit
  components/
    ui/                      # shadcn primitives (generated, lightly edited)
    shared/                  # reusable app components (DataTable, StatusBadge, EmptyState, MoneyText)
  features/
    briefs/                  # components, hooks, api calls, schemas for this feature
    quotes/
    factories/
    orders/
  lib/
    api/                     # generated client + fetch wrapper
    auth/                    # session helpers, route guards
    i18n/ format/ utils/
  messages/                  # en.json, hi.json, bn.json
```
Feature folders own their components, hooks and query keys. Shared things move to `components/shared` only after the third use.

## 3. Reusable code rules
1. **Types and validation come from `packages/shared`.** Never redefine a schema on the frontend.
2. **Composition over configuration.** Small components with clear props beat one giant component with 20 flags.
3. **Container/presentational split:** hooks fetch data (`useBrief`), components render.
4. **One place per concern:** API calls only in `lib/api` or `features/*/api.ts`; never `fetch` inside components.
5. **No magic strings:** status labels, routes, query keys in constants. Status → label/colour mapping in one `StatusBadge`.
6. **Formatting helpers:** `formatINR(paise)`, `formatDate()`, `formatQuantity()` used everywhere; never format money inline.
7. **Naming:** components `PascalCase.tsx`, hooks `useThing.ts`, utils `kebab-case.ts`, one exported component per file.
8. **Small components** (≈ ≤ 150 lines). Extract when a file does two jobs.
9. **Server Components by default;** add `"use client"` only for interactivity.

## 4. Data fetching and state
- Server state in TanStack Query with consistent key factories: `briefKeys.detail(id)`.
- Mutations invalidate precise keys. Use optimistic updates only where safe.
- Local UI state with `useState`/`useReducer`; avoid global stores until clearly needed (then Zustand).
- Handle **loading, empty, error, and success** states for every data view. Use skeletons, not spinners everywhere.
- Never store tokens in `localStorage`. Auth uses httpOnly cookies set by the backend.

## 5. Forms
- Schema from `packages/shared` → `zodResolver`.
- Inline field errors, disable submit while pending, prevent double-submit, show server error codes mapped to friendly messages.
- Long forms (brief, factory onboarding) = multi-step with draft autosave (server-side draft, not localStorage for sensitive data).
- File upload: request presigned URL from API, upload directly, show progress, validate type/size client-side AND rely on server validation.

## 6. UX and design principles
- **Mobile-first.** Test at 360px width. Large tap targets (≥ 44px).
- **Low-bandwidth friendly:** small bundles, lazy-load heavy parts, optimized images (next/image or Cloudflare Images), avoid huge client libraries.
- **Factory side is simple:** minimal steps, big buttons, WhatsApp as the primary channel; the web UI for factories should work for non-technical owners.
- **Trust UI:** always show verification tier with an honest tooltip explaining what was actually checked. Never show a stronger badge than the check performed.
- **Quote comparison:** side-by-side table that highlights price/unit, MOQ, lead time, certifications, factory tier, review score.
- Consistent design tokens (colours, spacing, radius) in Tailwind config; one primary colour; accessible contrast.

## 7. Accessibility
Semantic HTML, labelled inputs, keyboard navigation, visible focus, `aria-*` where needed, colour is never the only signal (status badges also have text/icon). Target WCAG AA.

## 8. i18n
All user-facing strings go through `next-intl` message keys from day one. No hardcoded text in components. Format numbers/dates/currency with locale-aware helpers. Plan for Devanagari and Bengali fonts and longer strings.

## 9. Security rules specific to frontend (see `05_SECURITY.md`)
- Never trust client-side checks for authorization; UI hides, **backend enforces**.
- Never use `dangerouslySetInnerHTML` with user content. If unavoidable, sanitize with DOMPurify and tell the human.
- No secrets in the frontend bundle. Only `NEXT_PUBLIC_*` public values.
- Validate and encode data from URL params and API.
- External links `rel="noopener noreferrer"`.
- Strict Content-Security-Policy and security headers (set via Cloudflare/Next headers).
- Do not log PII or tokens to the console or analytics.

## 10. Auth and routing
- Route groups per role; middleware redirects unauthenticated users, but every API call is still authorized server-side.
- Handle 401 (redirect to login, refresh flow) and 403/404 uniformly through the API wrapper.
- Admin UI visually distinct and never bundled into brand/factory routes beyond what is needed.

## 11. Performance
- Use Server Components, streaming, and route-level code splitting.
- Image optimization, font subsetting, avoid layout shift.
- Cache public factory pages (ISR/Cloudflare cache) with sensible revalidation; never cache authenticated data publicly.
- Track Core Web Vitals; budget JS per route.

## 12. Testing
- Unit/component tests for shared components, hooks, formatters.
- Playwright e2e for: login, factory onboarding, brief submit, shortlist view, quote compare, order status.
- Test empty/error states and mobile viewport.
- Mock the API with the typed client; no real network in unit tests.

## 13. Definition of done (frontend PR)
- [ ] Uses shared Zod schemas and generated API client
- [ ] Loading / empty / error / success states handled
- [ ] Mobile (360px) checked; keyboard and labels OK
- [ ] No hardcoded strings (i18n keys), no inline money formatting
- [ ] No `any`, no `dangerouslySetInnerHTML`, no secrets
- [ ] Tests added; lint and typecheck green
