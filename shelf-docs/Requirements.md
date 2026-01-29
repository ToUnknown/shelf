# Shelf — Product & Recipe Manager (Requirements)

## Overview

A private web app named "Shelf" for one household (owner + invited members). It centralizes all household products and uses automatic processing to update inventory and generate recipe ideas. Hosting: Vercel. Database: Convex.

## Goals

- Keep a shared, up-to-date list of products with quantities.
- Quickly add/remove items manually or via "Automatic mode" (no AI branding).
- Generate recipe suggestions and full recipes based on current products.

## Users & Access

- Single household shared by all members.
- Owner creates the household via "Create account".
- Owner can add member emails in Settings; added emails are reserved and cannot be used for Create account or Log in.
- Members use "Member of the household" flow; first time they set a password, later they log in with email + password in that same section.
- Invited members can accept or deny their invite; denial revokes the invite and frees the email.
- Each user has their own password.
- App stores a session token on the device so the password is only needed on new devices.
- User display names are short (e.g., "Max", "Roma") and shown in logs.
- Each user provides their own API key in Settings; it is saved and synced to that user across devices.

## Platforms

- Responsive UI for desktop and mobile.

## Tech Stack

- Framework: Next.js (App Router) with TypeScript.
- Hosting: Vercel.
- Database: Convex.

## Core Features

### 1) Authentication

- Private access for a single household (owner + invited members).
- Auth screen has 3 options: Create account, Log in, Member of the household.
- Create account is for the household owner.
- Owner adds member emails in Settings; those emails are reserved.
- Reserved member emails are not allowed in Create account or Log in.
- Member of the household flow:
  - First time: enter email, then set a new password.
  - Next times: enter email + password in the Member of the household section.
- Invite confirmations are sent from `no-reply@to-unknown.com` and must be accepted/denied via link (no inbound replies).

### 1.1) Settings

- Each user can enter their own API key.
- API key must be stored per-user and synced across their devices.
- Owner can add member emails (reserve access to the household).

### 2) Product Inventory

Each product has:

- Name (e.g., "Fresh tomatoes")
- Tag (e.g., "#vegetable")
- Amount as a structured pair: { value, unit } (e.g., 200 g or 3 pcs)

Manual management:

- Add, edit, remove products.
- Copy all products or all products from a category (copy format: name + amount only).
- Manual edit UI is a list of all products with search and inline editable fields.
- Amount inputs are validated before saving.

### 3) Tags & Categories

- Products are automatically split into categories using their tags.
- Automatic mode must see all existing tags to keep tag usage consistent.
- New tags are allowed, but the model should reuse an existing tag if it fits.

### 4) Automatic Mode (AI-powered, no AI branding)

- UI label: "Automatic mode".
- Input can be a paragraph or a list.
- User selects a toggle for "Add" or "Remove".
- Model compares input to existing DB and applies updates.
- Model must know about all current products to generate correct changes.
- Model: GPT-5.2.
- Unknown items should be auto-added.
- Changes apply immediately, with a single-step "Revert last automatic change" button.
- Manual edits are not revertible (user fixes directly in manual mode).
- Input can be multiple languages but is stored in English.

### 5) Suggestions Tab

- Separate tab named "Suggestions".
- Cards with image, meal name, and short description.
- Suggestions are stored in DB.
- Adding/removing products triggers regeneration of suggestions.
- Model decides how many suggestions to create, up to a max of 5.
- Button: "Create a recipe" to generate a full recipe for a chosen suggestion.

### 6) Recipes Tab

- Separate tab named "Recipes".
- Generated recipes stored in DB.
- User can delete a recipe with a button.
- Recipes can only be created from a suggestion.
- Each recipe card has a "Cooked" button:
  - Opens Automatic mode in Remove state.
  - Auto-fills the input with the recipe's product list.
  - User must manually confirm after reviewing/editing the removal list.

### 7) Recipe Generation Output (JSON)

Model output must be JSON:

- List of products needed with amounts (name, amount, tag).
- Separated preparation tasks (e.g., cutting, peeling).
- Step-by-step guide (without preparation tasks).
  Images for suggestions/recipes are generated via gpt-image-1 (low-quality option).

### 8) Change Log

- Separate tab to view a log of edits with who made each change.
- Store full before/after snapshots for each change to support undo of the last automatic change.

## Data Model (Draft)

- Household
  - id
  - ownerUserId
  - createdAt
- User
  - id
  - email
  - displayName (short, e.g., "Max")
  - householdId
  - role (owner/member)
  - apiKey
- MemberInvite
  - id
  - householdId
  - email
  - invitedAt
  - invitedBy (user id)
  - status (reserved/accepted/revoked)
- InviteToken (email confirmations)
  - id
  - householdId
  - inviteId
  - email
  - tokenHash
  - expiresAt
  - usedAt (optional)
  - createdAt
- Product
  - id
  - name
  - tag
  - category (derived)
  - amount
    - value (number)
    - unit (string)
  - amountGrams (number, optional normalized weight in grams)
  - amountMilliliters (number, optional normalized volume in milliliters)
  - updatedAt
  - updatedBy (user id)
- Suggestion
  - id
  - title
  - description
  - image
  - createdAt
- Recipe
  - id
  - title
  - sourceSuggestionId (optional)
  - jsonOutput
  - createdAt
- ChangeLog
  - id
  - userId
  - action (add/edit/remove/auto-add/auto-remove/undo)
  - entityType (product/suggestion/recipe)
  - entityId
  - before (snapshot)
  - after (snapshot)
  - createdAt

## Convex Plan (Reviewed)

This section adapts the Convex plan to match the requirements above.

### 1) Mental model (Convex)

Convex = database + backend functions + realtime sync.

- Database stores JSON-like documents in tables.
- Queries are reactive; UI updates when results change.
- Mutations write data transactionally.
- Actions call external services (OpenAI) then write via mutations.
- Scheduler lets mutations queue follow-up work (e.g., regenerate suggestions).

### 2) Recommended data model (tables)

Use `householdId` on every household-scoped table for multi-tenant safety.

#### 2.1) households

- `name: string`
- `ownerId: Id<"users">`
- `createdAt: number` (or use `_creationTime`)

#### 2.2) users

- `email: string`
- `displayName: string` (short, shown in logs)
- `householdId?: Id<"households">` (optional until they join)
- `role?: "owner" | "member"`
- `apiKey?: string` (per-user, synced across devices)

#### 2.3) memberInvites

- `householdId: Id<"households">`
- `email: string`
- `status: "reserved" | "accepted" | "revoked"` (revoked = owner cancels or member denies)
- `invitedAt: number`
- `invitedBy: Id<"users">`

#### 2.4) inviteTokens

- `householdId: Id<"households">`
- `inviteId: Id<"memberInvites">`
- `email: string`
- `tokenHash: string`
- `expiresAt: number`
- `usedAt?: number`
- `createdAt: number`

#### 2.5) products

- `householdId: Id<"households">`
- `name: string`
- `nameNormalized: string` (lowercase + trimmed for duplicate detection)
- `tag?: string` (e.g., "#dairy")
- `category?: string` (derived from tag)
- `amount: { value: number, unit: string }`
- `amountGrams?: number`
- `amountMilliliters?: number`
- `updatedAt: number`
- `updatedBy: Id<"users">`
- `source?: "manual" | "automatic"`

#### 2.6) suggestions

- `householdId: Id<"households">`
- `title: string`
- `description: string`
- `imageStorageId?: Id<"_storage">`
- `createdAt: number`
- `createdBy?: Id<"users">` or `"system"`

#### 2.7) recipes

- `householdId: Id<"households">`
- `sourceSuggestionId: Id<"suggestions">`
- `title: string`
- `jsonOutput: any` (required full JSON output: products, prep tasks, steps)
- `imageStorageId?: Id<"_storage">`
- `createdAt: number`

#### 2.8) changeLog

- `householdId: Id<"households">`
- `userId: Id<"users">` or `"system"`
- `action: "add" | "edit" | "remove" | "auto-add" | "auto-remove" | "undo" | "applyPatch"`
- `entityType: "product" | "suggestion" | "recipe"`
- `entityId: Id<any>`
- `before: any` (full snapshot)
- `after: any` (full snapshot)
- `createdAt: number`
- `undoGroupId?: string` (group all changes from one automatic run)

### 3) Schema + validation

- Create `convex/schema.ts` with `defineTable`.
- Use validators (`v.string()`, `v.number()`, `v.object()`, `v.optional()`, `v.array()`).
- Convex adds `_id` and `_creationTime`.

### 4) Indexes

Products:
- `products.by_household` on `householdId`
- `products.by_household_and_name` on `(householdId, nameNormalized)`

Member invites:
- `memberInvites.by_household_and_email` on `(householdId, email)`

Invite tokens:
- `inviteTokens.by_token_hash` on `tokenHash`

Suggestions / Recipes:
- `suggestions.by_household_and_time` on `(householdId, createdAt)`
- `recipes.by_household_and_suggestion` on `(householdId, sourceSuggestionId)`

Change log:
- `changeLog.by_household_and_time` on `(householdId, createdAt)`
- optional `changeLog.by_household_and_action_time` on `(householdId, action, createdAt)`

### 5) Auth & permissions

- Use Convex Auth with email/password (no recovery flow).
- Enforce reserved emails: only owner can create account; member emails must exist in `memberInvites`.
- Every query/mutation resolves current user and restricts data by `householdId`.
- Owner-only endpoints for invite reservation/revocation.

### 6) Email confirmations (implementation)

- Sender: `no-reply@to-unknown.com` (iCloud custom domain address).
- Use a Convex Node action (`"use node";`) with SMTP via iCloud (`smtp.mail.me.com:587`, STARTTLS).
- Store credentials in env vars (e.g., `ICLOUD_USER`, `ICLOUD_APP_PASSWORD`, `MAIL_FROM`) and never in code.
- Invite flow:
  - `invites:reserve` creates `memberInvites` and a single-use `inviteTokens` record (`tokenHash`, `expiresAt`).
  - Internal action `email:sendInvite({ to, acceptUrl, denyUrl })` sends the email.
  - Links open the app and call `invites:acceptWithToken` / `invites:declineWithToken`.
  - Mutations validate token, mark invite `accepted` or `revoked`, and mark token used.
- No inbound replies; leave `Reply-To` empty or set to `no-reply@to-unknown.com`.

### 7) Function map

Organize functions:
- `convex/products.ts`
- `convex/invites.ts`
- `convex/suggestions.ts`
- `convex/recipes.ts`
- `convex/automatic.ts`
- `convex/ai.ts`
- `convex/email.ts`
- `convex/auth.ts` (helpers)
- `convex/users.ts` (display name + apiKey)

Queries:
- `products:listByHousehold()`
- `products:listByCategory(category)` (for copy by category)
- `suggestions:listCurrent()` (<= 5)
- `recipes:getBySuggestion(suggestionId)`
- `changeLog:listRecent({ limit, filters? })`

Mutations:
- `products:addOrMerge({ name, amount, tag? })`
  - normalize `nameNormalized`, merge duplicates
  - write `changeLog` entry
  - schedule suggestions regeneration
- `products:updateAmount({ productId, amount })`
- `products:remove({ productId })`
- `invites:reserve({ email })` (owner-only, unique by household + email)
- `invites:acceptWithToken({ token })` (email link → status "accepted")
- `invites:declineWithToken({ token })` (email link → status "revoked")
- `invites:revoke({ email })` (owner cancels invite → status "revoked")
- `users:updateDisplayName({ displayName })`
- `users:updateApiKey({ apiKey })`
- `suggestions:replaceAll({ suggestions })` (internal use)
- `recipes:upsert({ suggestionId, recipe })`

Actions (external / AI):
- `email:sendInvite({ to, acceptUrl, denyUrl })` (internal, iCloud SMTP)
- `ai:regenerateSuggestions({ householdId })`
  - uses GPT-5.2, generates <= 5 suggestions
  - uses `gpt-image-1` low quality for images
- `ai:generateRecipeFromSuggestion({ suggestionId })`
  - outputs required JSON structure
  - optional image generation
- `ai:parseAutomaticModeInput({ inputText, householdId, mode })`
  - reads current products + tags
  - returns a structured patch (no writes yet)
  - translates to English for storage if needed

### 8) Automatic mode workflow

Step A — Action: create patch  
`ai:parseAutomaticModeInput`
- returns operations like:
  - `{ op: "decrement", product: "yogurt", by: 2 }`
  - `{ op: "increment", product: "milk", by: 1, unit: "L" }`
  - `{ op: "add", product: "bananas", amount: ... }`
  - `{ op: "remove", product: "old bread" }`

Step B — Mutation: apply patch  
`automatic:applyPatch({ patch })`
- computes full "before" snapshots
- applies operations (auto-add unknown items)
- writes one `changeLog` entry (action "applyPatch", `undoGroupId`)
- schedules suggestions regeneration

Step C — Mutation: undo last auto patch  
`automatic:undoLastAutoChange()`
- finds newest `changeLog` with action "applyPatch"
- restores from full `before` snapshots
- writes `changeLog` entry action "undo"
- schedules suggestions regeneration

### 9) Suggestions regeneration

On inventory changes (manual or automatic), schedule regeneration:
- `ctx.scheduler.runAfter(2000, internal.ai.regenerateSuggestions, { householdId })`

Reliability note:
- scheduled mutations are retried
- scheduled actions are at-most-once

### 10) Images (Convex File Storage)

- upload image bytes to Convex File Storage
- store `imageStorageId` in `suggestions` / `recipes`
- serve URLs via Convex APIs

### 11) UI usage pattern (Next.js)

- `useQuery` for reactive reads
- `useMutation` for form/button writes
- `useAction` for AI features with progress states

### 12) Build order

1. Convex setup + schema
2. Auth flow (owner + member invite)
3. Household creation + reserved emails
4. Email confirmations (iCloud SMTP + invite tokens)
5. Inventory CRUD (manual)
6. ChangeLog + history UI
7. Suggestions regeneration
8. Automatic mode (parse -> apply -> undo)
9. Recipe generation (+ optional images)

### 13) Definition of done

- All data scoped by `householdId`
- Owner-only endpoints enforce role
- Inventory mutations always write `changeLog` with full snapshots
- Suggestions regenerate on inventory changes
- Automatic mode supports undo of last auto change
- Suggestions limited to 5
- Recipes store required JSON output
- No base64 in documents (use File Storage)
- Email confirmations are sent from `no-reply@to-unknown.com` via Convex Node action and are accepted/denied via link

## Non-Functional Requirements

- Simple, fast UI.
- No AI branding in UI copy.
- Reliable sync across devices.
- Quantity normalization to grams for weight; display as kg if >= 1000 g (e.g., 1300 g → 1.3 kg).
- Quantity normalization to milliliters for volume; display as liters if >= 1000 ml (e.g., 1300 ml → 1.3 l).
- Duplicate items should merge quantities (same product identity).
- Product identity and merging are decided by the model based on DB context (e.g., "tomatoes" should match existing "Tomatoes").

## Project Plan (Draft)

1. Foundation
   - App skeleton, routing, basic UI layout.
   - Convex setup and schemas.
   - Owner account + member invite flow, session token storage, and reserved emails.
   - Email confirmations from `no-reply@to-unknown.com` via Convex Node action.
   - Display names (Max/Roma) wired into UI header + logs.
   - Separate passwords per user; no reset/rotation flow.

2. Inventory MVP
   - CRUD for products.
   - Tags and category derivation.
   - Amount structured fields + normalization to grams/ml + display formatting.
   - Copy buttons (all products / by category).
   - Merge quantities on duplicate items.

3. Automatic Mode
   - Prompt design + API integration for GPT-5.2.
   - Add/Remove toggle handling.
   - Parsing, matching, and DB update flow.
   - Auto-add unknown items.
   - Immediate apply + single-step revert.
   - Multilingual input → English storage.

4. Suggestions
   - Suggestion generation and storage.
   - Suggestions tab UI with cards.
   - Regeneration triggers on inventory changes.
   - gpt-image-1 image generation (low quality).
   - Max 5 suggestions, model decides count.

5. Recipes
   - Create recipe flow from a suggestion.
   - JSON output validation and storage.
   - Recipes tab + delete action.

6. Change Log
   - Store edit events with user attribution.
   - History tab UI with filtering (by user/date/action).

7. Polish & QA
   - Mobile refinements.
   - Edge cases (ambiguous input, duplicates).
   - Basic analytics/logging (optional).

## Open Questions

> Nothing for now
