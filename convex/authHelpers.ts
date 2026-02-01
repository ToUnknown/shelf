import { getAuthUserId } from "@convex-dev/auth/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";

type AuthCtx = QueryCtx | MutationCtx;

export const normalizeEmail = (value: string) => value.trim().toLowerCase();

export const getCurrentUser = async (ctx: AuthCtx) => {
  const userId = await getAuthUserId(ctx);
  if (!userId) return null;
  return ctx.db.get(userId);
};

export const requireUser = async (ctx: AuthCtx) => {
  const user = await getCurrentUser(ctx);
  if (!user) {
    throw new Error("You must be logged in.");
  }
  return user;
};

export const requireOwner = async (ctx: AuthCtx) => {
  const user = await requireUser(ctx);
  if (user.role !== "owner") {
    throw new Error("Owner access required.");
  }
  return user;
};

export const findUserByEmail = async (ctx: AuthCtx, email: string) => {
  return ctx.db
    .query("users")
    .withIndex("email", (q) => q.eq("email", email))
    .first();
};

export const findActiveInviteByEmail = async (
  ctx: AuthCtx,
  email: string,
) => {
  return ctx.db
    .query("memberInvites")
    .withIndex("by_email", (q) => q.eq("email", email))
    .filter((q) =>
      q.or(
        q.eq(q.field("status"), "reserved"),
        q.eq(q.field("status"), "accepted"),
      ),
    )
    .first();
};
