# Repository Guidelines

## Project Structure & Module Organization
This repository currently contains the product requirements (`Requirements.md`). The application code has not been scaffolded yet. When the Next.js + Convex project is created, keep to these conventions:
- `app/` for Next.js App Router pages and UI.
- `components/` for shared UI components.
- `convex/` for database schema, queries, and mutations.
- `public/` for static assets (icons, images).
- `tests/` for unit/integration tests (if added).

## Build, Test, and Development Commands
Once `package.json` exists (after scaffolding), the expected commands are:
- `npm install` — install dependencies.
- `npm run dev` — run the local dev server.
- `npm run build` — production build for Vercel.
- `npm run lint` — run linting (if configured).
- `npm test` — run tests (if configured).

## Coding Style & Naming Conventions
- TypeScript-first; use explicit types for Convex data models.
- Two-space indentation for Markdown and JSON; project code should follow the formatter once added.
- File and folder names in `kebab-case` or `camelCase` (be consistent within a directory).
- Component names in `PascalCase` (e.g., `ProductCard.tsx`).

## Testing Guidelines
Testing has not been set up yet. If tests are added:
- Place tests next to code (`*.test.ts`) or in `tests/`.
- Keep names descriptive (e.g., `inventory-merge.test.ts`).
- Prefer tests that cover product merging, unit normalization, and automatic mode parsing.

## Commit & Pull Request Guidelines
This repo is not a Git repository yet, so no commit conventions exist. If Git is initialized:
- Use clear, scoped messages (recommended: Conventional Commits, e.g., `feat: add product merge logic`).
- PRs should include a short summary, linked issues (if any), and screenshots for UI changes.

## Security & Configuration
- Keep secrets in `.env.local` (Convex keys, OpenAI keys) and never commit them.
- Hardcoded shared password is a requirement; store it in a private server-side config, not client-side.

## Implementation Status (Current MVP)
This repo already includes a scaffolded Next.js + Convex app with a manual product inventory UI. What’s implemented from `shelf-docs/Requirements.md`:

### Implemented
- Product inventory CRUD (manual):
  - Convex `products` table with `name`, `tag`, `amount`, `minAmount` (optional), `createdAt`, `updatedAt`.
  - Queries/mutations: list (ordered by `updatedAt`), create, update, delete with validation.
  - UI list with search, add/edit modals, delete, and loading state.
- Tag behavior:
  - UI placeholder `#other`.
  - Empty/legacy `#uncategorized` normalizes to `#other`.
  - Tags are normalized to always start with `#`.
- Amount handling:
  - UI supports `pcs`, `g`, `ml`.
  - Backend validator accepts `pcs`, `g`, `ml`, `kg`, `l`.
  - Min amount optional; validated before save.
- UX/UI polish:
  - Dark mode via `prefers-color-scheme` + dark classes (auto-sync with device settings).
  - Menu animations (fade-up, pop, stagger list items) + button hover/press feedback.
  - Mobile input font size prevents iOS zoom.
  - List edge fade (mask) and no-scrollbar treatment.
- Add menu suggestions:
  - While typing product name in Add, matching existing items appear.
  - Selecting a suggestion opens Edit for that item instead of creating a duplicate.

### Not implemented yet
- Authentication (owner/member flows, invites, settings, per-user API keys).
- Shopping list tab and auto low-stock behavior.
- Automatic mode (AI-powered add/remove + revert).
- Suggestions tab, recipe generation, recipes tab, change log.
- Household/user data model beyond `products`.

### Key files
- UI: `app/page.tsx`, `components/ProductForm.tsx`, `components/ProductListItem.tsx`
- Form logic: `lib/productForm.ts`
- Convex schema & functions: `convex/schema.ts`, `convex/products.ts`
- Global styles/animations: `app/globals.css`
