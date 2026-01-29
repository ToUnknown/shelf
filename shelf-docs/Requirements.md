# Shelf — Product & Recipe Manager (Requirements)

## Overview

A private web app named "Shelf" for me and my friend (we live together). It centralizes all household products and uses automatic processing to update inventory and generate recipe ideas. Hosting: Vercel. Database: Convex.

## Goals

- Keep a shared, up-to-date list of products with quantities.
- Quickly add/remove items manually or via "Automatic mode" (no AI branding).
- Generate recipe suggestions and full recipes based on current products.

## Users & Access

- Only two users (me + friend), pre-created accounts.
- Auth is a shared password.
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

- Private access for two people only.

### 1.1) Settings

- Each user can enter their own API key.
- API key must be stored per-user and synced across their devices.

### 2) Product Inventory

Each product has:

- Name (e.g., "Fresh tomatoes")
- Tag (e.g., "#vegetable")
- Amount as a structured pair: { value, unit } (e.g., 200 g or 3 pcs)

Manual management:

- Add, edit, remove products.
- Copy all products or all products from a category (copy format: name + amount only).

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
- Changes apply immediately, with a single-step "Revert last change" button.
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

## Data Model (Draft)

- User
  - id
  - name/email
  - displayName (short, e.g., "Max")
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
   - Shared-password auth, session token storage, and pre-created users.
   - Display names (Max/Roma) wired into UI header + logs.
   - Password is hardcoded; no reset/rotation flow.

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
