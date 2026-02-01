import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import {
  findActiveInviteByEmail,
  findUserByEmail,
  normalizeEmail,
  requireUser,
} from "./authHelpers";
import { getAuthUserId } from "@convex-dev/auth/server";

const ensureDisplayName = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error("Display name is required.");
  }
  if (trimmed.length > 32) {
    throw new Error("Display name is too long.");
  }
  return trimmed;
};

export const getCurrent = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    return ctx.db.get(userId);
  },
});

export const checkMemberInvite = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const email = normalizeEmail(args.email);
    if (!email) {
      return { inviteStatus: "none", hasUser: false, userRole: null } as const;
    }
    const invite = await ctx.db
      .query("memberInvites")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();
    const user = await findUserByEmail(ctx, email);
    return {
      inviteStatus: invite?.status ?? "none",
      hasUser: Boolean(user),
      userRole: (user?.role ?? null) as "owner" | "member" | null,
    } as const;
  },
});

export const createOwner = mutation({
  args: { displayName: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("You must be logged in.");
    }
    const user = await ctx.db.get(userId);
    if (!user) {
      throw new Error("User not found.");
    }
    if (user.role || user.householdId) {
      throw new Error("Account is already linked to a household.");
    }

    const displayName = ensureDisplayName(args.displayName);
    const email = normalizeEmail(user.email ?? "");
    if (!email) {
      throw new Error("Email is required.");
    }

    const activeInvite = await findActiveInviteByEmail(ctx, email);
    if (activeInvite) {
      throw new Error("Email is reserved for a household member.");
    }

    const existingUser = await findUserByEmail(ctx, email);
    if (existingUser && existingUser._id !== userId) {
      throw new Error("Email is already in use.");
    }

    const now = Date.now();
    const householdId = await ctx.db.insert("households", {
      name: "Household",
      ownerId: userId,
      createdAt: now,
    });

    await ctx.db.patch(userId, {
      displayName,
      householdId,
      role: "owner",
    });

    const legacyProducts = await ctx.db.query("products").collect();
    await Promise.all(
      legacyProducts
        .filter((product) => !product.householdId)
        .map((product) =>
          ctx.db.patch(product._id, {
            householdId,
            updatedBy: userId,
            updatedAt: now,
          }),
        ),
    );

    return { householdId };
  },
});

export const joinHousehold = mutation({
  args: { displayName: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("You must be logged in.");
    }
    const user = await ctx.db.get(userId);
    if (!user) {
      throw new Error("User not found.");
    }
    if (user.role || user.householdId) {
      throw new Error("Account is already linked to a household.");
    }

    const displayName = ensureDisplayName(args.displayName);
    const email = normalizeEmail(user.email ?? "");
    if (!email) {
      throw new Error("Email is required.");
    }

    const invite = await findActiveInviteByEmail(ctx, email);
    if (!invite || invite.status !== "accepted") {
      throw new Error("Invite not accepted yet.");
    }

    await ctx.db.patch(userId, {
      displayName,
      householdId: invite.householdId,
      role: "member",
    });

    return { householdId: invite.householdId };
  },
});

export const updateDisplayName = mutation({
  args: { displayName: v.string() },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const displayName = ensureDisplayName(args.displayName);
    await ctx.db.patch(user._id, { displayName });
  },
});

export const updateApiKey = mutation({
  args: { apiKey: v.string() },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const apiKey = args.apiKey.trim();
    await ctx.db.patch(user._id, { apiKey: apiKey || undefined });
  },
});
