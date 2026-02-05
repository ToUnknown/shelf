import { v } from "convex/values";
import { action, internalMutation, mutation, query } from "./_generated/server";
import type { FunctionReference } from "convex/server";
import {
  findActiveInviteByEmail,
  findUserByEmail,
  normalizeEmail,
  requireOwner,
} from "./authHelpers";

const getCurrentUserRef = "users:getCurrent" as unknown as FunctionReference<"query">;
const reserveInternalRef =
  "invites:reserveInternal" as unknown as FunctionReference<"mutation", "internal">;
const sendInviteRef = "email:sendInvite" as unknown as FunctionReference<"action">;

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

const TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export const list = query({
  args: {},
  handler: async (ctx) => {
    const owner = await requireOwner(ctx);
    const householdId = owner.householdId;
    if (!householdId) {
      return [];
    }
    return ctx.db
      .query("memberInvites")
      .withIndex("by_household_and_invitedAt", (q) =>
        q.eq("householdId", householdId),
      )
      .order("desc")
      .filter((q) => q.eq(q.field("status"), "reserved"))
      .collect();
  },
});

export const reserve = action({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const owner = await ctx.runQuery(getCurrentUserRef, {});
    if (!owner || owner.role !== "owner") {
      throw new Error("Owner access required.");
    }
    if (!owner.householdId) {
      throw new Error("Owner household not set.");
    }

    const email = normalizeEmail(args.email);
    if (!email) {
      throw new Error("Email is required.");
    }

    const token = randomToken();
    const tokenHash = await hashToken(token);
    const now = Date.now();
    const expiresAt = now + TOKEN_TTL_MS;

    const inviteId = await ctx.runMutation(reserveInternalRef, {
      email,
      tokenHash,
      expiresAt,
      householdId: owner.householdId,
      invitedBy: owner._id,
    });

    const baseUrl = process.env.APP_URL;
    if (!baseUrl) {
      throw new Error("Missing APP_URL environment variable.");
    }
    const acceptUrl = `${baseUrl}/invite/accept?token=${token}`;
    const denyUrl = `${baseUrl}/invite/decline?token=${token}`;

    await ctx.runAction(sendInviteRef, {
      to: email,
      acceptUrl,
      denyUrl,
    });

    return { inviteId };
  },
});

export const reserveInternal = internalMutation({
  args: {
    email: v.string(),
    tokenHash: v.string(),
    expiresAt: v.number(),
    householdId: v.id("households"),
    invitedBy: v.id("users"),
  },
  handler: async (ctx, args) => {
    const existingUser = await findUserByEmail(ctx, args.email);
    if (existingUser) {
      throw new Error("Email already belongs to a user.");
    }

    const activeInvite = await findActiveInviteByEmail(ctx, args.email);
    if (activeInvite) {
      throw new Error("Email is already reserved.");
    }

    const now = Date.now();
    const inviteId = await ctx.db.insert("memberInvites", {
      householdId: args.householdId,
      email: args.email,
      status: "reserved",
      invitedAt: now,
      invitedBy: args.invitedBy,
    });

    await ctx.db.insert("inviteTokens", {
      householdId: args.householdId,
      inviteId,
      email: args.email,
      tokenHash: args.tokenHash,
      expiresAt: args.expiresAt,
      createdAt: now,
    });

    return inviteId;
  },
});

export const acceptWithToken = mutation({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const tokenHash = await hashToken(args.token);
    const token = await ctx.db
      .query("inviteTokens")
      .withIndex("by_token_hash", (q) => q.eq("tokenHash", tokenHash))
      .first();

    if (!token) {
      throw new Error("Invalid invite token.");
    }
    if (token.usedAt) {
      throw new Error("Invite token already used.");
    }
    if (token.expiresAt < Date.now()) {
      throw new Error("Invite token expired.");
    }

    const invite = await ctx.db.get(token.inviteId);
    if (!invite || invite.status !== "reserved") {
      throw new Error("Invite is no longer active.");
    }

    await ctx.db.patch(invite._id, { status: "accepted" });
    await ctx.db.patch(token._id, { usedAt: Date.now() });

    return { householdId: invite.householdId };
  },
});

export const declineWithToken = mutation({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const tokenHash = await hashToken(args.token);
    const token = await ctx.db
      .query("inviteTokens")
      .withIndex("by_token_hash", (q) => q.eq("tokenHash", tokenHash))
      .first();

    if (!token) {
      throw new Error("Invalid invite token.");
    }
    if (token.usedAt) {
      throw new Error("Invite token already used.");
    }
    if (token.expiresAt < Date.now()) {
      throw new Error("Invite token expired.");
    }

    const invite = await ctx.db.get(token.inviteId);
    if (!invite || invite.status !== "reserved") {
      throw new Error("Invite is no longer active.");
    }

    await ctx.db.patch(invite._id, { status: "revoked" });
    await ctx.db.patch(token._id, { usedAt: Date.now() });

    return { householdId: invite.householdId };
  },
});

export const revoke = mutation({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const owner = await requireOwner(ctx);
    const householdId = owner.householdId;
    if (!householdId) {
      throw new Error("Owner household not set.");
    }
    const email = normalizeEmail(args.email);
    if (!email) {
      throw new Error("Email is required.");
    }

    const invites = await ctx.db
      .query("memberInvites")
      .withIndex("by_household_and_email", (q) =>
        q.eq("householdId", householdId).eq("email", email),
      )
      .collect();

    const activeInvites = invites.filter((item) => item.status !== "revoked");
    if (activeInvites.length === 0) {
      throw new Error("Invite not found.");
    }

    await Promise.all(
      activeInvites.map((item) =>
        ctx.db.patch(item._id, { status: "revoked" }),
      ),
    );
    return { status: "revoked" } as const;
  },
});
