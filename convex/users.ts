import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { mutation, query, type MutationCtx } from "./_generated/server";
import {
  findActiveInviteByEmail,
  findUserByEmail,
  normalizeEmail,
  requireOwner,
  requireUser,
} from "./authHelpers";

const EMAIL_VERIFY_TTL_MS = 24 * 60 * 60 * 1000;

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

const randomToken = () => {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");
};

const hashToken = async (token: string) => {
  const data = new TextEncoder().encode(token);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");
};

const getInviteStatus = (
  invites: Array<{ status: "reserved" | "accepted" | "revoked" }>,
) => {
  if (invites.some((invite) => invite.status === "reserved")) {
    return "reserved" as const;
  }
  if (invites.some((invite) => invite.status === "accepted")) {
    return "accepted" as const;
  }
  return "none" as const;
};

const clearUserProductReferences = async (
  ctx: MutationCtx,
  args: { householdId: Id<"households">; userId: Id<"users"> },
) => {
  const products = await ctx.db
    .query("products")
    .withIndex("by_household", (q) => q.eq("householdId", args.householdId))
    .collect();
  await Promise.all(
    products
      .filter((product) => product.updatedBy === args.userId)
      .map((product) => ctx.db.patch(product._id, { updatedBy: undefined })),
  );
};

const removeInviteWithTokens = async (
  ctx: MutationCtx,
  inviteId: Id<"memberInvites">,
) => {
  const tokens = await ctx.db
    .query("inviteTokens")
    .withIndex("by_invite", (q) => q.eq("inviteId", inviteId))
    .collect();
  await Promise.all(tokens.map((token) => ctx.db.delete(token._id)));
  await ctx.db.delete(inviteId);
};

const removeInviteDataByEmail = async (
  ctx: MutationCtx,
  email: string,
) => {
  const invites = await ctx.db
    .query("memberInvites")
    .withIndex("by_email", (q) => q.eq("email", email))
    .collect();
  await Promise.all(invites.map((invite) => removeInviteWithTokens(ctx, invite._id)));

  const inviteTokens = await ctx.db
    .query("inviteTokens")
    .withIndex("by_email", (q) => q.eq("email", email))
    .collect();
  await Promise.all(inviteTokens.map((token) => ctx.db.delete(token._id)));
};

const removeEmailVerificationTokensByUser = async (
  ctx: MutationCtx,
  userId: Id<"users">,
) => {
  const tokens = await ctx.db
    .query("emailVerificationTokens")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();
  await Promise.all(tokens.map((token) => ctx.db.delete(token._id)));
};

const removeAuthDataForUser = async (
  ctx: MutationCtx,
  userId: Id<"users">,
) => {
  const accounts = await ctx.db
    .query("authAccounts")
    .withIndex("userIdAndProvider", (q) => q.eq("userId", userId))
    .collect();

  for (const account of accounts) {
    const verificationCodes = await ctx.db
      .query("authVerificationCodes")
      .withIndex("accountId", (q) => q.eq("accountId", account._id))
      .collect();
    await Promise.all(
      verificationCodes.map((verificationCode) =>
        ctx.db.delete(verificationCode._id),
      ),
    );
    await ctx.db.delete(account._id);
  }

  const sessions = await ctx.db
    .query("authSessions")
    .withIndex("userId", (q) => q.eq("userId", userId))
    .collect();

  const verifiers = await ctx.db.query("authVerifiers").collect();

  for (const session of sessions) {
    const refreshTokens = await ctx.db
      .query("authRefreshTokens")
      .withIndex("sessionId", (q) => q.eq("sessionId", session._id))
      .collect();
    await Promise.all(
      refreshTokens.map((refreshToken) => ctx.db.delete(refreshToken._id)),
    );

    await Promise.all(
      verifiers
        .filter((verifier) => verifier.sessionId === session._id)
        .map((verifier) => ctx.db.delete(verifier._id)),
    );

    await ctx.db.delete(session._id);
  }
};

const deleteUserAccount = async (
  ctx: MutationCtx,
  userId: Id<"users">,
) => {
  const user = await ctx.db.get(userId);
  if (!user) return;

  const email = normalizeEmail(user.email ?? "");
  if (email) {
    await removeInviteDataByEmail(ctx, email);

    const emailTokens = await ctx.db
      .query("emailVerificationTokens")
      .withIndex("by_email", (q) => q.eq("email", email))
      .collect();
    await Promise.all(emailTokens.map((token) => ctx.db.delete(token._id)));
  }

  await removeEmailVerificationTokensByUser(ctx, userId);
  await removeAuthDataForUser(ctx, userId);
  await ctx.db.delete(userId);
};

const queueAccountVerificationEmail = async (
  ctx: MutationCtx,
  args: { userId: Id<"users">; email: string },
) => {
  await removeEmailVerificationTokensByUser(ctx, args.userId);

  const token = randomToken();
  const tokenHash = await hashToken(token);
  const now = Date.now();

  await ctx.db.insert("emailVerificationTokens", {
    userId: args.userId,
    email: args.email,
    tokenHash,
    expiresAt: now + EMAIL_VERIFY_TTL_MS,
    createdAt: now,
  });

  const baseUrl = process.env.APP_URL;
  if (!baseUrl) {
    throw new Error("Missing APP_URL environment variable.");
  }

  const verifyUrl = `${baseUrl}/verify-email?token=${token}`;
  await ctx.scheduler.runAfter(0, api.email.sendAccountVerification, {
    to: args.email,
    verifyUrl,
  });
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
      return {
        inviteStatus: "none",
        hasUser: false,
        userRole: null,
        blockedForOwner: false,
      } as const;
    }

    const invites = await ctx.db
      .query("memberInvites")
      .withIndex("by_email", (q) => q.eq("email", email))
      .collect();
    const inviteStatus = getInviteStatus(invites);

    const user = await findUserByEmail(ctx, email);
    const userRole = (user?.role ?? null) as "owner" | "member" | null;
    const blockedForOwner = userRole === "member" || inviteStatus !== "none";

    return {
      inviteStatus,
      hasUser: Boolean(user),
      userRole,
      blockedForOwner,
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
      appEmailVerifiedAt: undefined,
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

    await queueAccountVerificationEmail(ctx, { userId, email });
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
      appEmailVerifiedAt: undefined,
    });

    await queueAccountVerificationEmail(ctx, { userId, email });
    return { householdId: invite.householdId };
  },
});

export const resendVerificationEmail = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    if (!user.role || !user.householdId) {
      throw new Error("Account is not fully set up.");
    }
    if (user.appEmailVerifiedAt) {
      return { status: "already-verified" } as const;
    }

    const email = normalizeEmail(user.email ?? "");
    if (!email) {
      throw new Error("Email is required.");
    }

    await queueAccountVerificationEmail(ctx, { userId: user._id, email });
    return { status: "sent" } as const;
  },
});

export const verifyEmailWithToken = mutation({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const tokenHash = await hashToken(args.token);
    const token = await ctx.db
      .query("emailVerificationTokens")
      .withIndex("by_token_hash", (q) => q.eq("tokenHash", tokenHash))
      .first();

    if (!token) {
      throw new Error("Invalid verification token.");
    }
    if (token.usedAt) {
      throw new Error("Verification token already used.");
    }
    if (token.expiresAt < Date.now()) {
      throw new Error("Verification token expired.");
    }

    const user = await ctx.db.get(token.userId);
    if (!user) {
      throw new Error("User not found.");
    }
    if (normalizeEmail(user.email ?? "") !== token.email) {
      throw new Error("Verification token does not match the account.");
    }

    const now = Date.now();
    await ctx.db.patch(user._id, { appEmailVerifiedAt: now });
    await ctx.db.patch(token._id, { usedAt: now });

    const otherTokens = await ctx.db
      .query("emailVerificationTokens")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    await Promise.all(
      otherTokens
        .filter((otherToken) => otherToken._id !== token._id)
        .map((otherToken) => ctx.db.delete(otherToken._id)),
    );

    return { status: "verified" } as const;
  },
});

export const listMembers = query({
  args: {},
  handler: async (ctx) => {
    const owner = await requireOwner(ctx);
    const householdId = owner.householdId;
    if (!householdId) {
      return [];
    }

    const users = await ctx.db
      .query("users")
      .withIndex("by_household", (q) => q.eq("householdId", householdId))
      .collect();

    const members = users
      .filter((member) => member.role === "member")
      .map((member) => ({
        type: "member" as const,
        key: `member:${member._id}`,
        userId: member._id,
        displayName: member.displayName ?? null,
        email: member.email ?? null,
        statusLabel: null as string | null,
      }));

    const memberEmails = new Set(
      members
        .map((member) => normalizeEmail(member.email ?? ""))
        .filter((email): email is string => Boolean(email)),
    );

    const acceptedInvites = await ctx.db
      .query("memberInvites")
      .withIndex("by_household_and_invitedAt", (q) => q.eq("householdId", householdId))
      .order("desc")
      .filter((q) => q.eq(q.field("status"), "accepted"))
      .collect();

    const pendingAcceptedInvites = acceptedInvites
      .filter((invite) => {
        const normalizedEmail = normalizeEmail(invite.email);
        if (!normalizedEmail) return false;
        return !memberEmails.has(normalizedEmail);
      })
      .map((invite) => ({
        type: "inviteAccepted" as const,
        key: `invite:${invite._id}`,
        userId: null as Id<"users"> | null,
        displayName: null as string | null,
        email: invite.email,
        statusLabel: "Invite accepted",
      }));

    return [...members, ...pendingAcceptedInvites].sort((left, right) =>
      (left.displayName ?? left.email ?? "").localeCompare(
        right.displayName ?? right.email ?? "",
      ),
    );
  },
});

export const removeMember = mutation({
  args: { memberId: v.id("users") },
  handler: async (ctx, args) => {
    const owner = await requireOwner(ctx);
    const householdId = owner.householdId;
    if (!householdId) {
      throw new Error("Owner household not set.");
    }

    const member = await ctx.db.get(args.memberId);
    if (!member || member.role !== "member" || member.householdId !== householdId) {
      throw new Error("Member not found.");
    }

    await clearUserProductReferences(ctx, {
      householdId,
      userId: member._id,
    });
    await deleteUserAccount(ctx, member._id);
    return { status: "deleted" } as const;
  },
});

export const leaveHousehold = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    if (user.role !== "member") {
      throw new Error("Only members can leave household.");
    }
    if (!user.householdId) {
      throw new Error("Household not set.");
    }

    await clearUserProductReferences(ctx, {
      householdId: user.householdId,
      userId: user._id,
    });
    await deleteUserAccount(ctx, user._id);
    return { status: "left" } as const;
  },
});

export const deleteMyAccount = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    if (user.role !== "owner") {
      throw new Error("Only owner can delete household account.");
    }
    if (!user.householdId) {
      throw new Error("Household not set.");
    }

    const householdId = user.householdId;

    const products = await ctx.db
      .query("products")
      .withIndex("by_household", (q) => q.eq("householdId", householdId))
      .collect();
    await Promise.all(products.map((product) => ctx.db.delete(product._id)));

    const invites = await ctx.db
      .query("memberInvites")
      .withIndex("by_household_and_invitedAt", (q) =>
        q.eq("householdId", householdId),
      )
      .collect();
    await Promise.all(
      invites.map((invite) => removeInviteWithTokens(ctx, invite._id)),
    );

    const householdUsers = await ctx.db
      .query("users")
      .withIndex("by_household", (q) => q.eq("householdId", householdId))
      .collect();
    for (const householdUser of householdUsers) {
      await deleteUserAccount(ctx, householdUser._id);
    }

    await ctx.db.delete(householdId);
    return { status: "deleted" } as const;
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
