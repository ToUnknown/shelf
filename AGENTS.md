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
