import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireUser } from "./authHelpers";

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
    const user = await requireUser(ctx);
    if (!user.householdId) {
      return [];
    }
    return ctx.db
      .query("products")
      .withIndex("by_household_and_updatedAt", (q) =>
        q.eq("householdId", user.householdId),
      )
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
    const user = await requireUser(ctx);
    if (!user.householdId) {
      throw new Error("Household not set.");
    }
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
      householdId: user.householdId,
      name,
      tag,
      amount: args.amount,
      minAmount: args.minAmount,
      createdAt: now,
      updatedAt: now,
      updatedBy: user._id,
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
    const user = await requireUser(ctx);
    if (!user.householdId) {
      throw new Error("Household not set.");
    }
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

    const product = await ctx.db.get(args.id);
    if (!product || product.householdId !== user.householdId) {
      throw new Error("Product not found.");
    }

    await ctx.db.patch(args.id, {
      name,
      tag,
      amount: args.amount,
      minAmount: args.minAmount,
      updatedAt: Date.now(),
      updatedBy: user._id,
    });
  },
});

export const remove = mutation({
  args: { id: v.id("products") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    if (!user.householdId) {
      throw new Error("Household not set.");
    }
    const product = await ctx.db.get(args.id);
    if (!product || product.householdId !== user.householdId) {
      throw new Error("Product not found.");
    }
    await ctx.db.delete(args.id);
  },
});
