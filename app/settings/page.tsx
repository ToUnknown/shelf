"use client";

import { useEffect, useState } from "react";
import { useAction, useConvexAuth, useMutation, useQuery } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { useRouter } from "next/navigation";
import { api } from "../../convex/_generated/api";
import AuthScreen from "../../components/AuthScreen";
import type { Doc, Id } from "../../convex/_generated/dataModel";

export default function SettingsPage() {
  const router = useRouter();
  const auth = useConvexAuth();
  const { signOut } = useAuthActions();

  const currentUser = useQuery(
    api.users.getCurrent,
    auth.isAuthenticated ? {} : "skip",
  );
  const isReady = Boolean(
    auth.isAuthenticated && currentUser?.role && currentUser?.householdId,
  );
  const isLoadingUser = auth.isAuthenticated && currentUser === undefined;
  const isEmailVerified = Boolean(currentUser?.appEmailVerifiedAt);

  const updateDisplayName = useMutation(api.users.updateDisplayName);
  const updateApiKey = useMutation(api.users.updateApiKey);
  const resendVerificationEmail = useMutation(api.users.resendVerificationEmail);
  const reserveInvite = useAction(api.invites.reserve);
  const revokeInvite = useMutation(api.invites.revoke);
  const removeMember = useMutation(api.users.removeMember);
  const leaveHousehold = useMutation(api.users.leaveHousehold);
  const deleteMyAccount = useMutation(api.users.deleteMyAccount);
  const invites = useQuery(
    api.invites.list,
    currentUser?.role === "owner" ? {} : "skip",
  );
  const members = useQuery(
    api.users.listMembers,
    currentUser?.role === "owner" ? {} : "skip",
  );

  const [profileName, setProfileName] = useState("");
  const [profileApiKey, setProfileApiKey] = useState("");
  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const [profileBusy, setProfileBusy] = useState(false);

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteMessage, setInviteMessage] = useState<string | null>(null);
  const [inviteBusy, setInviteBusy] = useState(false);
  const [memberMessage, setMemberMessage] = useState<string | null>(null);
  const [memberBusyId, setMemberBusyId] = useState<Id<"users"> | null>(null);
  const [acceptedBusyEmail, setAcceptedBusyEmail] = useState<string | null>(null);
  const [dangerBusy, setDangerBusy] = useState(false);
  const [verificationBusy, setVerificationBusy] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [verificationMessage, setVerificationMessage] = useState<string | null>(
    null,
  );

  useEffect(() => {
    if (!currentUser) return;
    setProfileName(currentUser.displayName ?? "");
    setProfileApiKey(currentUser.apiKey ?? "");
  }, [currentUser]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timeoutId = setTimeout(() => {
      setResendCooldown((value) => Math.max(0, value - 1));
    }, 1000);
    return () => clearTimeout(timeoutId);
  }, [resendCooldown]);

  const handleSaveProfile = async () => {
    setProfileMessage(null);
    setProfileBusy(true);
    try {
      await updateDisplayName({ displayName: profileName });
      await updateApiKey({ apiKey: profileApiKey });
      setProfileMessage("Saved.");
    } catch (error) {
      setProfileMessage(
        error instanceof Error ? error.message : "Could not save profile.",
      );
    } finally {
      setProfileBusy(false);
    }
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim()) {
      setInviteMessage("Email is required.");
      return;
    }
    setInviteMessage(null);
    setInviteBusy(true);
    try {
      await reserveInvite({ email: inviteEmail });
      setInviteMessage("Invite sent.");
      setInviteEmail("");
    } catch (error) {
      setInviteMessage(
        error instanceof Error ? error.message : "Invite failed.",
      );
    } finally {
      setInviteBusy(false);
    }
  };

  const handleResendVerification = async () => {
    if (resendCooldown > 0) return;
    setVerificationMessage(null);
    setVerificationBusy(true);
    try {
      await resendVerificationEmail({});
      setVerificationMessage("Verification email sent. Check your inbox.");
      setResendCooldown(30);
    } catch (error) {
      setVerificationMessage(
        error instanceof Error
          ? error.message
          : "Could not send verification email.",
      );
    } finally {
      setVerificationBusy(false);
    }
  };

  const handleRemoveMember = async (memberId: Id<"users">, label: string) => {
    if (!confirm(`Delete ${label}'s account from this household?`)) return;
    setMemberMessage(null);
    setMemberBusyId(memberId);
    try {
      await removeMember({ memberId });
      setMemberMessage("Member removed.");
    } catch (error) {
      setMemberMessage(
        error instanceof Error ? error.message : "Could not remove member.",
      );
    } finally {
      setMemberBusyId(null);
    }
  };

  const handleDeleteAcceptedInvite = async (email: string, label: string) => {
    if (!confirm(`Delete accepted invite for ${label}?`)) return;
    setMemberMessage(null);
    setAcceptedBusyEmail(email);
    try {
      await revokeInvite({ email });
      setMemberMessage("Accepted invite removed.");
    } catch (error) {
      setMemberMessage(
        error instanceof Error ? error.message : "Could not remove accepted invite.",
      );
    } finally {
      setAcceptedBusyEmail(null);
    }
  };

  const handleLeaveHousehold = async () => {
    if (!confirm("Leaving household will permanently delete your account. Continue?")) {
      return;
    }
    setDangerBusy(true);
    try {
      await leaveHousehold({});
      await signOut();
      router.push("/");
    } catch (error) {
      setMemberMessage(
        error instanceof Error ? error.message : "Could not leave household.",
      );
    } finally {
      setDangerBusy(false);
    }
  };

  const handleDeleteOwnerAccount = async () => {
    if (
      !confirm(
        "Delete household and all member accounts permanently? This cannot be undone.",
      )
    ) {
      return;
    }
    setDangerBusy(true);
    try {
      await deleteMyAccount({});
      await signOut();
      router.push("/");
    } catch (error) {
      setMemberMessage(
        error instanceof Error ? error.message : "Could not delete household.",
      );
    } finally {
      setDangerBusy(false);
    }
  };

  if (auth.isLoading) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center px-4">
        <div className="neo-panel-strong anim-pop rounded-3xl px-6 py-4 text-sm text-[var(--muted)]">
          Loading session...
        </div>
      </div>
    );
  }

  if (!isReady) {
    return <AuthScreen isLoadingUser={isLoadingUser} />;
  }

  if (!isEmailVerified) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center px-4 py-6">
        <div className="neo-panel-strong anim-pop relative w-full max-w-2xl overflow-hidden rounded-[1.7rem] p-6 sm:p-8">
          <p className="neo-kicker">Settings</p>
          <h1 className="neo-heading mt-3 text-4xl leading-[0.92] sm:text-5xl">
            Verify your email
          </h1>
          <p className="mt-4 max-w-lg text-sm leading-relaxed text-[var(--muted)] sm:text-base">
            Confirm your email to open settings. We sent a verification link to{" "}
            {currentUser?.email}.
          </p>
          {verificationMessage ? (
            <p className="mt-4 text-sm text-[var(--muted)]">{verificationMessage}</p>
          ) : null}
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => router.push("/")}
              className="neo-btn-ghost"
            >
              Back
            </button>
            <button
              type="button"
              onClick={handleResendVerification}
              disabled={verificationBusy || resendCooldown > 0}
              className="neo-btn"
            >
              {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend email"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const invitesCount = invites?.length ?? 0;
  const membersCount =
    members?.filter((member) => member.type === "member").length ?? 0;
  const acceptedInvitesCount =
    members?.filter((member) => member.type === "inviteAccepted").length ?? 0;

  return (
    <div className="h-[100dvh] min-h-[100dvh] overflow-hidden px-0 py-0 md:px-6 md:py-6">
      <main className="mx-auto h-full w-full max-w-3xl">
        <section className="mobile-main-surface neo-panel-strong anim-fade-up settings-shell flex h-full min-h-0 flex-col rounded-none p-0 md:rounded-[1.6rem]">
          <div className="mobile-safe-inline settings-header">
            <div className="settings-header-inner">
              <div>
                <p className="neo-kicker">Settings</p>
                <h1 className="neo-heading mt-1 text-2xl sm:text-3xl">Control center</h1>
                <p className="settings-subtitle mt-1 pb-2 md:pb-0 text-sm text-[var(--muted)]">
                  Account, access, and household safety controls.
                </p>
              </div>
              <button
                type="button"
                onClick={() => router.push("/")}
                className="neo-btn-ghost"
              >
                Back
              </button>
            </div>
          </div>

          <div className="mobile-safe-inline settings-scroll mt-0 flex-1 min-h-0 overflow-y-auto pb-[calc(1rem+env(safe-area-inset-bottom))] no-scrollbar md:pb-4">
            <div className="settings-card settings-card-profile mt-4 px-4 pb-4 pt-5 md:mt-4">
              <div className="settings-card-heading">
                <p className="settings-section-title">PROFILE</p>
              </div>
              <div className="settings-field-stack mt-3">
                <div>
                  <label className="neo-kicker">Display name</label>
                  <input
                    value={profileName}
                    onChange={(event) => setProfileName(event.target.value)}
                    className="neo-input mt-2"
                  />
                </div>
                <div>
                  <label className="neo-kicker">API key</label>
                  <input
                    value={profileApiKey}
                    onChange={(event) => setProfileApiKey(event.target.value)}
                    className="neo-input mt-2"
                  />
                </div>
              </div>
              {profileMessage ? (
                <p className="mt-3 text-sm text-[var(--muted)]">{profileMessage}</p>
              ) : null}
              <div className="settings-actions mt-4 flex flex-wrap items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => signOut()}
                  className="neo-btn-ghost"
                >
                  Sign out
                </button>
                <button
                  type="button"
                  onClick={handleSaveProfile}
                  disabled={profileBusy}
                  className="neo-btn"
                >
                  Save
                </button>
              </div>
            </div>

            {currentUser?.role === "owner" ? (
              <div className="settings-card p-4">
                <div className="settings-card-heading settings-card-heading-spread">
                  <p className="settings-section-title">HOUSEHOLD</p>
                  <span className="settings-badge">
                    {invitesCount} invites · {membersCount} members
                    {acceptedInvitesCount > 0
                      ? ` · ${acceptedInvitesCount} accepted`
                      : ""}
                  </span>
                </div>

                <div className="mt-3">
                  <label className="neo-kicker">Invite member</label>
                  <div className="settings-inline-form mt-2 flex flex-wrap gap-2">
                    <input
                      value={inviteEmail}
                      onChange={(event) => setInviteEmail(event.target.value)}
                      placeholder="Member@example.com"
                      className="neo-input flex-1"
                    />
                    <button
                      type="button"
                      onClick={handleInvite}
                      disabled={inviteBusy}
                      className="neo-btn-ghost"
                    >
                      Send
                    </button>
                  </div>
                  {inviteMessage ? (
                    <p className="mt-2 text-sm text-[var(--muted)]">{inviteMessage}</p>
                  ) : null}
                </div>

                <div className="mt-4">
                  <p className="neo-kicker">Invites</p>
                  <div className="settings-list mt-2 grid gap-2">
                    {invites === undefined ? (
                      <p className="text-sm text-[var(--muted)]">Loading invites...</p>
                    ) : invites.length === 0 ? (
                      <p className="text-sm text-[var(--muted)]">No invites yet.</p>
                    ) : (
                      invites.map((invite: Doc<"memberInvites">) => (
                        <div
                          key={invite._id}
                          className="settings-row neo-panel-strong flex flex-wrap items-center justify-between gap-2 rounded-xl px-3 py-2 text-sm text-[var(--muted)]"
                        >
                          <div>
                            <p className="font-semibold text-[var(--foreground)]">
                              {invite.email}
                            </p>
                            <p className="text-xs text-[var(--muted)]">{invite.status}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => revokeInvite({ email: invite.email })}
                            className="neo-btn-ghost neo-btn-danger"
                          >
                            Revoke
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="neo-divider my-4" />
                <div>
                  <p className="neo-kicker">Members</p>
                  <div className="settings-list mt-2 grid gap-2">
                    {members === undefined ? (
                      <p className="text-sm text-[var(--muted)]">Loading members...</p>
                    ) : members.length === 0 ? (
                      <p className="text-sm text-[var(--muted)]">No members yet.</p>
                    ) : (
                      members.map((member) => {
                        const canRemove =
                          member.type === "member" && Boolean(member.userId);
                        const canDeleteAccepted =
                          member.type === "inviteAccepted" && Boolean(member.email);
                        const memberLabel =
                          member.displayName || member.email || "member";
                        return (
                        <div
                          key={member.key}
                          className="settings-row neo-panel-strong flex flex-wrap items-center justify-between gap-2 rounded-xl px-3 py-2 text-sm text-[var(--muted)]"
                        >
                          <div>
                            <p className="font-semibold text-[var(--foreground)]">
                              {member.displayName || member.email || "Member"}
                            </p>
                            <div className="flex flex-wrap items-center gap-1.5">
                              <p className="text-xs text-[var(--muted)]">
                                {member.email || "No email"}
                              </p>
                              {member.statusLabel ? (
                                <span className="rounded-full border border-[color:color-mix(in_oklab,var(--line-strong)_75%,transparent)] bg-[color:color-mix(in_oklab,var(--panel-strong)_86%,transparent)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
                                  {member.statusLabel}
                                </span>
                              ) : null}
                            </div>
                          </div>
                          {canRemove ? (
                            <button
                              type="button"
                              onClick={() =>
                                handleRemoveMember(
                                  member.userId as Id<"users">,
                                  memberLabel,
                                )
                              }
                              disabled={memberBusyId === member.userId}
                              className="neo-btn-ghost neo-btn-danger disabled:opacity-60"
                            >
                              Remove
                            </button>
                          ) : canDeleteAccepted ? (
                            <button
                              type="button"
                              onClick={() =>
                                handleDeleteAcceptedInvite(
                                  member.email as string,
                                  memberLabel,
                                )
                              }
                              disabled={acceptedBusyEmail === member.email}
                              className="neo-btn-ghost neo-btn-danger disabled:opacity-60"
                            >
                              Delete
                            </button>
                          ) : null}
                        </div>
                      );
                      })
                    )}
                  </div>
                  {memberMessage ? (
                    <p className="mt-2 text-sm text-[var(--muted)]">{memberMessage}</p>
                  ) : null}
                </div>
              </div>
            ) : null}

            {currentUser?.role === "owner" ? (
              <div className="settings-card settings-danger-card p-4">
                <p className="neo-kicker text-[var(--danger)]">Danger zone</p>
                <p className="mt-2 text-sm text-[var(--danger)]">
                  Deleting owner account will remove this household and all member accounts.
                </p>
                <div className="mt-4 flex justify-center">
                  <button
                    type="button"
                    onClick={handleDeleteOwnerAccount}
                    disabled={dangerBusy}
                    className="neo-btn-ghost neo-btn-danger disabled:opacity-60"
                  >
                    Delete household
                  </button>
                </div>
              </div>
            ) : (
              <div className="settings-card settings-danger-card p-4">
                <p className="neo-kicker text-[var(--danger)]">Danger zone</p>
                <p className="mt-2 text-sm text-[var(--danger)]">
                  Leaving household permanently deletes your account.
                </p>
                <button
                  type="button"
                  onClick={handleLeaveHousehold}
                  disabled={dangerBusy}
                  className="neo-btn-ghost neo-btn-danger mt-4 justify-self-start disabled:opacity-60"
                >
                  Leave household
                </button>
                {memberMessage ? (
                  <p className="mt-2 text-sm text-[var(--muted)]">{memberMessage}</p>
                ) : null}
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
