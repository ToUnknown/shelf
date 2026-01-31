# Convex plan for “Shelf” (household inventory)

This document is a practical “how to use Convex” plan tailored to the Shelf project. It’s written for someone new to databases and backend work.

---

## 1) What Convex is (mental model)

Convex = **database + backend functions + realtime sync**.

- **Database** stores JSON-like **documents** inside **tables**.
- **Queries** read data and are _reactive_: UI updates automatically when results change.
- **Mutations** write data transactionally (all-or-nothing).
- **Actions** call external services (e.g., OpenAI) and then write results via mutations.
- **Scheduler** lets mutations schedule follow-up work (e.g., regenerate suggestions).

You usually **don’t build REST endpoints**. Your app calls Convex functions directly.

---

## 2) Recommended data model (tables)

> Names are suggestions; adjust as you like. Use `householdId` everywhere for multi-tenant safety

### 2.1 `households`

Stores a household/group.

Fields:

- `name: string`
- `ownerId: Id<"users">`
- `createdAt: number` (or use `_creationTime`)

### 2.2 `users`

Represents an authenticated user.

Fields:

- `email: string`
- `name?: string`
- `householdId?: Id<"households">` (optional until they join)
- `role?: "owner" | "member"` (or store membership in a separate table)

### 2.3 `memberInvites`

Invitations reserved by the owner for specific emails.

Fields:

- `householdId: Id<"households">`
- `email: string`
- `status: "reserved" | "accepted" | "revoked"`
- `createdBy: Id<"users">`

### 2.4 `products`

Inventory items.

Fields:

- `householdId: Id<"households">`
- `name: string`
- `nameNormalized: string` (for duplicate detection; e.g., lowercase + trimmed)
- `tag?: string` (e.g., “dairy”, “meat”, “snack”)
- `amount: { value: number, unit: string }`
- `amountGrams?: number` (optional normalized for comparisons)
- `amountMilliliters?: number`
- `updatedAt: number`
- `updatedBy: Id<"users">`
- `source?: "manual" | "automatic"`

### 2.5 `suggestions`

AI-generated suggestions based on inventory.

Fields:

- `householdId: Id<"households">`
- `title: string`
- `description: string`
- `reasoningShort?: string` (keep it short)
- `imageStorageId?: Id<"_storage">` (Convex File Storage ID)
- `createdAt: number`
- `createdBy?: Id<"users">` or `"system"`

### 2.6 `recipes`

Recipes generated from a suggestion.

Fields:

- `householdId: Id<"households">`
- `suggestionId: Id<"suggestions">`
- `title: string`
- `ingredients: Array<{ name: string, amount?: string }>`
- `steps: string[]`
- `imageStorageId?: Id<"_storage">`
- `createdAt: number`

### 2.7 `changeLog`

Log changes for history and undo (especially for automatic mode).

Fields:

- `householdId: Id<"households">`
- `type: "manual" | "auto" | "undo"`
- `action: "add" | "remove" | "update" | "merge" | "applyPatch" | "undoLastAuto"`
- `actorId: Id<"users">` or `"system"`
- `createdAt: number`
- `before?: any` (snapshot or minimal diff)
- `after?: any`
- `undoGroupId?: string` (optional: group changes from one automatic run)

---

## 3) Schema + validation approach

Create `convex/schema.ts` and:

- define each table with `defineTable`
- use validators (`v.string()`, `v.number()`, `v.object()`, `v.optional()`, `v.array()`, etc.)
- add indexes (next section)

Convex automatically adds:

- `_id`
- `_creationTime`

---

## 4) Indexes you’ll likely need

Indexes make “filter by X” fast.

### Products

- `products.by_household` on `householdId`
- `products.by_household_and_name` on `(householdId, nameNormalized)`

### Member invites

- `memberInvites.by_household_and_email` on `(householdId, email)`

### Suggestions / Recipes

- `suggestions.by_household_and_time` on `(householdId, createdAt)`
- `recipes.by_household_and_suggestion` on `(householdId, suggestionId)`

### Change log

- `changeLog.by_household_and_time` on `(householdId, createdAt)`
- optionally `changeLog.by_household_and_type_time` on `(householdId, type, createdAt)`

---

## 5) Auth & permissions (how to keep households isolated)

### 5.1 Auth choice

Use Convex authentication (Convex Auth) with an email/password provider if you want “passwords without recovery”.

### 5.2 Permission rules (must-have)

Every query/mutation that touches household data should:

1. identify the current user
2. determine their `householdId`
3. restrict reads/writes to that household only

### 5.3 Roles

- Owner can: create household, reserve/revoke invites, possibly delete household.
- Member can: view + modify products, view suggestions/recipes.

---

## 6) Function map (what code you will write)

Organize files like:

- `convex/products.ts`
- `convex/invites.ts`
- `convex/suggestions.ts`
- `convex/recipes.ts`
- `convex/automatic.ts`
- `convex/ai.ts`
- `convex/auth.ts` (helpers)

### 6.1 Queries (read)

`products:listByHousehold()`

- returns products for the caller’s household
- sorted by name or last updated

`suggestions:listCurrent()`

- returns up to 5 latest suggestions

`recipes:getBySuggestion(suggestionId)`

- returns recipe for a suggestion

`changeLog:listRecent(limit)`

- returns recent log items

### 6.2 Mutations (write)

`products:addOrMerge({ name, amount, tag? })`

- normalize name (nameNormalized)
- if product exists for same household+nameNormalized: merge/update amount
- else insert new product
- write `changeLog` entry (type "manual")
- schedule suggestions regeneration

`products:updateAmount({ productId, amount })`

- update amount + updatedAt/updatedBy
- changeLog
- schedule suggestions regeneration

`products:remove({ productId })`

- delete product
- changeLog
- schedule suggestions regeneration

`invites:reserve({ email })`

- owner-only
- insert `memberInvites` reserved
- enforce unique (householdId + email)

`invites:accept()`

- during signup/join flow:
  - confirm invite exists and is reserved
  - set `users.householdId` and `role`
  - mark invite accepted

`suggestions:replaceAll({ suggestions })`

- internal use (called by action after AI)
- deletes old suggestions for household (or marks them stale)
- inserts up to 5 new suggestions

`recipes:upsert({ suggestionId, recipe })`

- store generated recipe content and imageStorageId

### 6.3 Actions (external / AI work)

`ai:regenerateSuggestions({ householdId })`

- reads products list (possibly using internal query)
- calls OpenAI
- formats results into <= 5 suggestions
- calls `suggestions:replaceAll`

`ai:generateRecipeFromSuggestion({ suggestionId })`

- reads suggestion + products
- calls OpenAI to create recipe JSON
- optionally generates image
- calls `recipes:upsert`

`ai:parseAutomaticModeInput({ inputText, householdId })`

- reads current products
- calls OpenAI to produce a structured “patch”
- returns patch (do not write yet)

### 6.4 Automatic mode workflow (important)

Goal: user writes one message like “I ate 2 yogurts and bought milk”, and inventory updates immediately, with an **Undo last auto change** button.

**Step A — Action: create patch**
`ai:parseAutomaticModeInput`

- returns patch operations, e.g.
  - `{ op: "decrement", product: "yogurt", by: 2 }`
  - `{ op: "increment", product: "milk", by: 1, unit: "L" }`
  - `{ op: "add", product: "bananas", amount: ... }`
  - `{ op: "remove", product: "old bread" }`

**Step B — Mutation: apply patch (transaction)**
`automatic:applyPatch({ patch })`

- compute “before” snapshot for changed items
- apply operations with merge rules
- write one `changeLog` entry for the entire patch (type "auto", action "applyPatch")
- schedule suggestions regeneration

**Step C — Mutation: undo last auto patch**
`automatic:undoLastAutoChange()`

- find newest `changeLog` entry with type "auto"
- restore from “before” snapshot
- write `changeLog` entry type "undo"
- schedule suggestions regeneration

Implementation note:

- Storing only the minimal “before” state for items you touched is usually enough.
- Keep undo limited to “last auto change” by always undoing the most recent auto log entry.

---

## 7) Suggestions regeneration (no background server needed)

When inventory changes (manual or automatic), schedule regeneration:

In `products:*` and `automatic:applyPatch` and `automatic:undoLastAutoChange`:

- `ctx.scheduler.runAfter(2000, internal.ai.regenerateSuggestions, { householdId })`

Use a short delay to avoid spamming AI calls if the user edits multiple things quickly.

Reliability note:

- scheduled **mutations** are retried (more reliable),
- scheduled **actions** are at-most-once.
  If you want maximum reliability, schedule a mutation that coordinates the action or store “pending regeneration” state.

---

## 8) Images (Convex File Storage)

If you generate suggestion/recipe images:

1. upload bytes to Convex File Storage
2. store `imageStorageId` in `suggestions` / `recipes`
3. use Convex APIs to serve URL in the UI

Avoid storing base64 in documents.

---

## 9) UI usage pattern (Next.js)

In React/Next:

- Use Convex hooks to call queries (reactive read)
- Call mutations on button clicks/forms
- Call actions for AI features, then display progress states

A typical screen:

- Inventory page:
  - `useQuery(products:listByHousehold)`
  - `useMutation(products:addOrMerge)` etc.
- Suggestions page:
  - `useQuery(suggestions:listCurrent)`
  - “Generate recipe” button -> `useAction(ai:generateRecipeFromSuggestion)`

---

## 10) Build order (recommended implementation steps)

1. Convex setup + schema (tables + indexes)
2. Auth flow (sign up / login)
3. Household creation (owner) + invite reservation
4. Join flow (member accepts invite)
5. Inventory CRUD (manual add/edit/remove)
6. ChangeLog + display basic history
7. Suggestions regeneration (scheduler + action + replaceAll mutation)
8. Automatic mode: parse input -> apply patch -> undo last auto change
9. Recipe generation (+ optional images)

---

## 11) “Definition of done” checklist

- [ ] Every product/suggestion/recipe/log is scoped to `householdId`
- [ ] Owner-only endpoints enforce owner role
- [ ] All inventory mutations create changeLog entries
- [ ] Suggestions regenerate after inventory changes
- [ ] Automatic mode applies patch and can undo last auto change
- [ ] Suggestions limited to 5
- [ ] No base64 stored in documents (use File Storage)
