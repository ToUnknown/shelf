import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  products: defineTable({
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
  })
    .index("by_updatedAt", ["updatedAt"])
    .index("by_name", ["name"]),
});
