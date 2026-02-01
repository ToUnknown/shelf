import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

const users = defineTable({
  name: v.optional(v.string()),
  image: v.optional(v.string()),
  email: v.optional(v.string()),
  emailVerificationTime: v.optional(v.number()),
  phone: v.optional(v.string()),
  phoneVerificationTime: v.optional(v.number()),
  isAnonymous: v.optional(v.boolean()),
  displayName: v.optional(v.string()),
  householdId: v.optional(v.id("households")),
  role: v.optional(v.union(v.literal("owner"), v.literal("member"))),
  apiKey: v.optional(v.string()),
})
  .index("email", ["email"])
  .index("phone", ["phone"])
  .index("by_household", ["householdId"]);

const households = defineTable({
  name: v.string(),
  ownerId: v.id("users"),
  createdAt: v.number(),
});

const memberInvites = defineTable({
  householdId: v.id("households"),
  email: v.string(),
  status: v.union(
    v.literal("reserved"),
    v.literal("accepted"),
    v.literal("revoked"),
  ),
  invitedAt: v.number(),
  invitedBy: v.id("users"),
})
  .index("by_household_and_email", ["householdId", "email"])
  .index("by_email", ["email"]);

const inviteTokens = defineTable({
  householdId: v.id("households"),
  inviteId: v.id("memberInvites"),
  email: v.string(),
  tokenHash: v.string(),
  expiresAt: v.number(),
  usedAt: v.optional(v.number()),
  createdAt: v.number(),
}).index("by_token_hash", ["tokenHash"]);

const products = defineTable({
  householdId: v.optional(v.id("households")),
  name: v.string(),
  tag: v.string(),
  amount: v.object({
    value: v.number(),
    unit: v.string(),
  }),
  minAmount: v.optional(
    v.object({
      value: v.number(),
      unit: v.string(),
    }),
  ),
  createdAt: v.number(),
  updatedAt: v.number(),
  updatedBy: v.optional(v.id("users")),
})
  .index("by_household", ["householdId"])
  .index("by_household_and_updatedAt", ["householdId", "updatedAt"])
  .index("by_updatedAt", ["updatedAt"])
  .index("by_name", ["name"]);

export default defineSchema({
  ...authTables,
  users,
  households,
  memberInvites,
  inviteTokens,
  products,
});
