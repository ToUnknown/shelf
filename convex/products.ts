import { v } from "convex/values";
import { mutationGeneric, queryGeneric } from "convex/server";

const mutation = mutationGeneric;
const query = queryGeneric;

const amountValidator = v.object({
  value: v.number(),
  unit: v.string(),
});

const validateAmount = (amount: { value: number; unit: string }) => {
  if (!Number.isFinite(amount.value) || amount.value <= 0) {
    throw new Error("Amount value must be a positive number.");
  }
  const normalizedUnit = amount.unit.trim().toLowerCase();
  const allowedUnits = ["pcs", "g", "ml", "kg", "l"];
  if (!normalizedUnit) {
    throw new Error("Amount unit is required.");
  }
  if (!allowedUnits.includes(normalizedUnit)) {
    throw new Error("Unit must be pcs, grams, or milliliters.");
  }
};

export const list = query({
  args: {},
  handler: async (ctx) => {
    return ctx.db
      .query("products")
      .withIndex("by_updatedAt")
      .order("desc")
      .collect();
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    tag: v.string(),
    amount: amountValidator,
    minAmount: v.optional(amountValidator),
  },
  handler: async (ctx, args) => {
    const name = args.name.trim();
    const tag = args.tag.trim();
    if (!name) {
      throw new Error("Product name is required.");
    }
    if (!tag) {
      throw new Error("Tag is required.");
    }
    validateAmount(args.amount);
    if (args.minAmount) {
      validateAmount(args.minAmount);
    }

    const now = Date.now();
    return ctx.db.insert("products", {
      name,
      tag,
      amount: args.amount,
      minAmount: args.minAmount,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("products"),
    name: v.string(),
    tag: v.string(),
    amount: amountValidator,
    minAmount: v.optional(amountValidator),
  },
  handler: async (ctx, args) => {
    const name = args.name.trim();
    const tag = args.tag.trim();
    if (!name) {
      throw new Error("Product name is required.");
    }
    if (!tag) {
      throw new Error("Tag is required.");
    }
    validateAmount(args.amount);
    if (args.minAmount) {
      validateAmount(args.minAmount);
    }

    await ctx.db.patch(args.id, {
      name,
      tag,
      amount: args.amount,
      minAmount: args.minAmount,
      updatedAt: Date.now(),
    });
  },
});

export const remove = mutation({
  args: { id: v.id("products") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});
