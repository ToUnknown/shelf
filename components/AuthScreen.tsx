"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuthActions } from "@convex-dev/auth/react";
import { useConvex, useConvexAuth, useMutation, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";

const normalizeEmail = (value: string) => value.trim().toLowerCase();

type AuthScreenProps = {
  isLoadingUser: boolean;
};

type PendingSetup = {
  type: "owner" | "member";
  displayName: string;
} | null;

type Tab = "create" | "login" | "member";
type MemberStep = "email" | "signup" | "signin";

export default function AuthScreen({ isLoadingUser }: AuthScreenProps) {
  const auth = useConvexAuth();
  const convex = useConvex();
  const { signIn, signOut } = useAuthActions();
  const createOwner = useMutation(api.users.createOwner);
  const joinHousehold = useMutation(api.users.joinHousehold);

  const [tab, setTab] = useState<Tab>("create");
  const [pendingSetup, setPendingSetup] = useState<PendingSetup>(null);

  const [ownerCreate, setOwnerCreate] = useState({
    displayName: "",
    email: "",
    password: "",
  });
  const [ownerLogin, setOwnerLogin] = useState({ email: "", password: "" });
  const [memberEmailInput, setMemberEmailInput] = useState("");
  const [memberEmail, setMemberEmail] = useState<string | null>(null);
  const [memberStep, setMemberStep] = useState<MemberStep>("email");
  const [memberForm, setMemberForm] = useState({
    displayName: "",
    password: "",
  });

  const [ownerCreateError, setOwnerCreateError] = useState<string | null>(null);
  const [ownerLoginError, setOwnerLoginError] = useState<string | null>(null);
  const [memberError, setMemberError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const inviteInfo = useQuery(
    api.users.checkMemberInvite,
    memberEmail ? { email: memberEmail } : "skip",
  );

  useEffect(() => {
    if (!memberEmail || !inviteInfo) return;
    if (inviteInfo.userRole === "owner") {
      setMemberError("This email already belongs to an owner account.");
      return;
    }
    if (inviteInfo.inviteStatus !== "accepted") {
      if (inviteInfo.inviteStatus === "reserved") {
        setMemberError("Check your email to accept the invite first.");
      } else {
        setMemberError("This email is not invited.");
      }
      setMemberStep("email");
      return;
    }

    setMemberError(null);
    if (inviteInfo.hasUser) {
      setMemberStep("signin");
    } else {
      setMemberStep("signup");
    }
  }, [inviteInfo, memberEmail]);

  useEffect(() => {
    if (!pendingSetup || !auth.isAuthenticated) return;
    let cancelled = false;
    const finishSetup = async () => {
      try {
        if (pendingSetup.type === "owner") {
          await createOwner({ displayName: pendingSetup.displayName });
        } else {
          await joinHousehold({ displayName: pendingSetup.displayName });
        }
      } catch (error) {
        if (!cancelled) {
          const message =
            error instanceof Error ? error.message : "Setup failed.";
          setMemberError(message);
          setOwnerCreateError(message);
          await signOut();
        }
      } finally {
        if (!cancelled) {
          setPendingSetup(null);
          setBusy(false);
        }
      }
    };
    void finishSetup();
    return () => {
      cancelled = true;
    };
  }, [auth.isAuthenticated, createOwner, joinHousehold, pendingSetup, signOut]);

  const handleOwnerCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    setOwnerCreateError(null);
    setBusy(true);
    try {
      const email = normalizeEmail(ownerCreate.email);
      const info = await convex.query(api.users.checkMemberInvite, { email });
      if (info.userRole === "member" || info.inviteStatus !== "none") {
        throw new Error(
          "This email is reserved for a member. Use the Member tab instead.",
        );
      }
      if (info.hasUser) {
        throw new Error("Email is already in use.");
      }

      await signIn("password", {
        flow: "signUp",
        email,
        password: ownerCreate.password,
        roleIntent: "owner",
      });
      setPendingSetup({
        type: "owner",
        displayName: ownerCreate.displayName.trim(),
      });
    } catch (error) {
      setOwnerCreateError(
        error instanceof Error ? error.message : "Sign up failed.",
      );
      setBusy(false);
    }
  };

  const handleOwnerLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setOwnerLoginError(null);
    setBusy(true);
    try {
      const email = normalizeEmail(ownerLogin.email);
      const info = await convex.query(api.users.checkMemberInvite, { email });
      if (info.userRole === "member" || info.inviteStatus !== "none") {
        throw new Error(
          "This email belongs to a member flow. Use the Member tab instead.",
        );
      }

      await signIn("password", {
        flow: "signIn",
        email,
        password: ownerLogin.password,
        roleIntent: "owner",
      });
      setBusy(false);
    } catch (error) {
      setOwnerLoginError(
        error instanceof Error ? error.message : "Login failed.",
      );
      setBusy(false);
    }
  };

  const handleMemberContinue = (event: React.FormEvent) => {
    event.preventDefault();
    setMemberError(null);
    const email = normalizeEmail(memberEmailInput);
    if (!email) {
      setMemberError("Email is required.");
      return;
    }
    setMemberEmail(email);
  };

  const handleMemberSignup = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!memberEmail) return;
    setMemberError(null);
    setBusy(true);
    try {
      const info = await convex.query(api.users.checkMemberInvite, {
        email: memberEmail,
      });
      if (info.userRole === "owner") {
        throw new Error("This email belongs to an owner account.");
      }
      if (info.inviteStatus !== "accepted") {
        throw new Error("Invite is not accepted yet.");
      }
      if (info.hasUser) {
        throw new Error("Account already exists. Use member log in.");
      }

      await signIn("password", {
        flow: "signUp",
        email: memberEmail,
        password: memberForm.password,
        roleIntent: "member",
      });
      setPendingSetup({
        type: "member",
        displayName: memberForm.displayName.trim(),
      });
    } catch (error) {
      setMemberError(
        error instanceof Error ? error.message : "Sign up failed.",
      );
      setBusy(false);
    }
  };

  const handleMemberSignin = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!memberEmail) return;
    setMemberError(null);
    setBusy(true);
    try {
      const info = await convex.query(api.users.checkMemberInvite, {
        email: memberEmail,
      });
      if (info.userRole !== "member") {
        throw new Error("Member account not found.");
      }

      await signIn("password", {
        flow: "signIn",
        email: memberEmail,
        password: memberForm.password,
        roleIntent: "member",
      });
      setBusy(false);
    } catch (error) {
      setMemberError(
        error instanceof Error ? error.message : "Login failed.",
      );
      setBusy(false);
    }
  };

  const pendingMessage = useMemo(() => {
    if (pendingSetup) return "Finishing setup...";
    if (auth.isAuthenticated && isLoadingUser) return "Loading your profile...";
    return null;
  }, [auth.isAuthenticated, isLoadingUser, pendingSetup]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--background)] px-4 py-10 text-slate-900 dark:text-slate-100">
      <div className="w-full max-w-xl rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-2xl dark:border-slate-700 dark:bg-slate-900/90 sm:p-8 anim-pop">
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.4em] text-slate-500 dark:text-slate-400">
            Shelf
          </p>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
            Welcome back
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Sign in or create a household account.
          </p>
        </div>

        {pendingMessage ? (
          <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white/70 p-4 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-400">
            {pendingMessage}
          </div>
        ) : null}

        <div className="mt-6 grid grid-cols-3 gap-2">
          {([
            { id: "create", label: "Create account" },
            { id: "login", label: "Log in" },
            { id: "member", label: "Member" },
          ] as const).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setTab(item.id);
                setOwnerCreateError(null);
                setOwnerLoginError(null);
                setMemberError(null);
              }}
              className={`rounded-full px-3 py-2 text-xs font-semibold transition sm:text-sm ${
                tab === item.id
                  ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                  : "border border-slate-200 text-slate-600 hover:border-slate-300 dark:border-slate-700 dark:text-slate-400"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="mt-6">
          {tab === "create" ? (
            <form onSubmit={handleOwnerCreate} className="grid gap-4">
              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                  Display name
                </label>
                <input
                  value={ownerCreate.displayName}
                  onChange={(event) =>
                    setOwnerCreate((state) => ({
                      ...state,
                      displayName: event.target.value,
                    }))
                  }
                  placeholder="Max"
                  className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-base text-slate-900 shadow-sm transition focus:border-slate-400 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                  Email
                </label>
                <input
                  type="email"
                  value={ownerCreate.email}
                  onChange={(event) =>
                    setOwnerCreate((state) => ({
                      ...state,
                      email: event.target.value,
                    }))
                  }
                  placeholder="you@example.com"
                  className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-base text-slate-900 shadow-sm transition focus:border-slate-400 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                  Password
                </label>
                <input
                  type="password"
                  value={ownerCreate.password}
                  onChange={(event) =>
                    setOwnerCreate((state) => ({
                      ...state,
                      password: event.target.value,
                    }))
                  }
                  placeholder="Minimum 8 characters"
                  className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-base text-slate-900 shadow-sm transition focus:border-slate-400 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                />
              </div>
              {ownerCreateError ? (
                <p className="text-sm text-rose-600 dark:text-rose-400">
                  {ownerCreateError}
                </p>
              ) : null}
              <button
                type="submit"
                disabled={busy}
                className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-100 dark:text-slate-900"
              >
                Create household
              </button>
            </form>
          ) : null}

          {tab === "login" ? (
            <form onSubmit={handleOwnerLogin} className="grid gap-4">
              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                  Email
                </label>
                <input
                  type="email"
                  value={ownerLogin.email}
                  onChange={(event) =>
                    setOwnerLogin((state) => ({
                      ...state,
                      email: event.target.value,
                    }))
                  }
                  placeholder="you@example.com"
                  className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-base text-slate-900 shadow-sm transition focus:border-slate-400 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                  Password
                </label>
                <input
                  type="password"
                  value={ownerLogin.password}
                  onChange={(event) =>
                    setOwnerLogin((state) => ({
                      ...state,
                      password: event.target.value,
                    }))
                  }
                  className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-base text-slate-900 shadow-sm transition focus:border-slate-400 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                />
              </div>
              {ownerLoginError ? (
                <p className="text-sm text-rose-600 dark:text-rose-400">
                  {ownerLoginError}
                </p>
              ) : null}
              <button
                type="submit"
                disabled={busy}
                className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-100 dark:text-slate-900"
              >
                Log in
              </button>
            </form>
          ) : null}

          {tab === "member" ? (
            <div className="grid gap-4">
              {memberStep === "email" ? (
                <form onSubmit={handleMemberContinue} className="grid gap-4">
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                      Email
                    </label>
                    <input
                      type="email"
                      value={memberEmailInput}
                      onChange={(event) => setMemberEmailInput(event.target.value)}
                      placeholder="you@example.com"
                      className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-base text-slate-900 shadow-sm transition focus:border-slate-400 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                    />
                  </div>
                  {memberError ? (
                    <p className="text-sm text-rose-600 dark:text-rose-400">
                      {memberError}
                    </p>
                  ) : null}
                  <button
                    type="submit"
                    className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:-translate-y-0.5 hover:border-slate-300 dark:border-slate-700 dark:text-slate-200"
                  >
                    Continue
                  </button>
                </form>
              ) : null}

              {memberStep === "signup" ? (
                <form onSubmit={handleMemberSignup} className="grid gap-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                    {memberEmail}
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                      Display name
                    </label>
                    <input
                      value={memberForm.displayName}
                      onChange={(event) =>
                        setMemberForm((state) => ({
                          ...state,
                          displayName: event.target.value,
                        }))
                      }
                      placeholder="Roma"
                      className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-base text-slate-900 shadow-sm transition focus:border-slate-400 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                      Password
                    </label>
                    <input
                      type="password"
                      value={memberForm.password}
                      onChange={(event) =>
                        setMemberForm((state) => ({
                          ...state,
                          password: event.target.value,
                        }))
                      }
                      placeholder="Minimum 8 characters"
                      className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-base text-slate-900 shadow-sm transition focus:border-slate-400 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                    />
                  </div>
                  {memberError ? (
                    <p className="text-sm text-rose-600 dark:text-rose-400">
                      {memberError}
                    </p>
                  ) : null}
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => {
                        setMemberStep("email");
                        setMemberEmail(null);
                        setMemberError(null);
                      }}
                      className="text-sm font-semibold text-slate-500 transition hover:text-slate-700 dark:text-slate-400"
                    >
                      Change email
                    </button>
                    <button
                      type="submit"
                      disabled={busy}
                      className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-100 dark:text-slate-900"
                    >
                      Set password
                    </button>
                  </div>
                </form>
              ) : null}

              {memberStep === "signin" ? (
                <form onSubmit={handleMemberSignin} className="grid gap-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                    {memberEmail}
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                      Password
                    </label>
                    <input
                      type="password"
                      value={memberForm.password}
                      onChange={(event) =>
                        setMemberForm((state) => ({
                          ...state,
                          password: event.target.value,
                        }))
                      }
                      className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-base text-slate-900 shadow-sm transition focus:border-slate-400 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                    />
                  </div>
                  {memberError ? (
                    <p className="text-sm text-rose-600 dark:text-rose-400">
                      {memberError}
                    </p>
                  ) : null}
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => {
                        setMemberStep("email");
                        setMemberEmail(null);
                        setMemberError(null);
                      }}
                      className="text-sm font-semibold text-slate-500 transition hover:text-slate-700 dark:text-slate-400"
                    >
                      Change email
                    </button>
                    <button
                      type="submit"
                      disabled={busy}
                      className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-100 dark:text-slate-900"
                    >
                      Log in
                    </button>
                  </div>
                </form>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
