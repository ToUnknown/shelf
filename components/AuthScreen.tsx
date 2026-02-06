"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
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
const tabOrder: Tab[] = ["create", "login", "member"];
const AUTH_FADE_MS = 190;

const accessHeadlines = [
  "Ready to restock?",
  "Let’s check the shelves",
  "Inventory, but calm",
  "Enter the stockroom",
  "Stockroom access",
  "Open the pantry",
  "Set your shelves",
  "Quiet inventory",
  "Keep it stocked",
  "Start tracking",
  "Inventory access",
  "Household ready",
  "Let’s get stocked",
  "Stock check time",
  "Shelf control",
  "Your household hub",
  "Keep tabs on stock",
  "Lightweight inventory",
  "Track what matters",
  "Stay in control",
  "Fresh stock status",
  "Stockroom reset",
  "Monitor the pantry",
  "Stockroom mode",
];

export default function AuthScreen({ isLoadingUser }: AuthScreenProps) {
  const auth = useConvexAuth();
  const convex = useConvex();
  const { signIn, signOut } = useAuthActions();
  const createOwner = useMutation(api.users.createOwner);
  const joinHousehold = useMutation(api.users.joinHousehold);

  const [tab, setTab] = useState<Tab>("create");
  const [isTabTransitioning, setIsTabTransitioning] = useState(false);
  const [leavingTab, setLeavingTab] = useState<Tab | null>(null);
  const fadeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const authStackRef = useRef<HTMLDivElement | null>(null);
  const authStackRafRef = useRef<number | null>(null);
  const previousStackHeightRef = useRef<number | null>(null);
  const [authStackHeight, setAuthStackHeight] = useState<number | null>(null);
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
  const [accessHeadline] = useState(
    () => accessHeadlines[Math.floor(Math.random() * accessHeadlines.length)],
  );

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
    if (inviteInfo.userRole === "member" && inviteInfo.hasUser) {
      setMemberError(null);
      setMemberStep("signin");
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
  const activeTabIndex = Math.max(0, tabOrder.indexOf(tab));

  const handleTabChange = (nextTab: Tab) => {
    setOwnerCreateError(null);
    setOwnerLoginError(null);
    setMemberError(null);
    if (nextTab === tab) return;
    if (fadeTimeoutRef.current) {
      clearTimeout(fadeTimeoutRef.current);
    }
    setIsTabTransitioning(true);
    setLeavingTab(tab);
    setTab(nextTab);
    fadeTimeoutRef.current = setTimeout(() => {
      setLeavingTab(null);
      setIsTabTransitioning(false);
      fadeTimeoutRef.current = null;
    }, AUTH_FADE_MS);
  };

  useLayoutEffect(() => {
    const node = authStackRef.current;
    if (!node || typeof window === "undefined") return;

    const activeTabNode = node.querySelector<HTMLElement>(
      '.auth-tab[data-active="true"] .auth-tab-content',
    );
    const measuredHeight = Math.round(
      activeTabNode?.scrollHeight ?? node.scrollHeight,
    );

    if (!window.matchMedia("(max-width: 767px)").matches) {
      if (authStackRafRef.current !== null) {
        window.cancelAnimationFrame(authStackRafRef.current);
        authStackRafRef.current = null;
      }
      setAuthStackHeight(null);
      previousStackHeightRef.current = measuredHeight;
      return;
    }

    const nextHeight = measuredHeight;
    const prevHeight = previousStackHeightRef.current ?? nextHeight;
    if (authStackHeight === null) {
      setAuthStackHeight(nextHeight);
      previousStackHeightRef.current = nextHeight;
      return;
    }
    if (Math.abs(nextHeight - prevHeight) < 1) {
      previousStackHeightRef.current = nextHeight;
      return;
    }

    setAuthStackHeight(prevHeight);
    if (authStackRafRef.current !== null) {
      window.cancelAnimationFrame(authStackRafRef.current);
    }
    authStackRafRef.current = window.requestAnimationFrame(() => {
      setAuthStackHeight(nextHeight);
      authStackRafRef.current = null;
    });
    previousStackHeightRef.current = nextHeight;
  }, [authStackHeight, tab, memberStep, ownerCreateError, ownerLoginError, memberError]);

  useEffect(() => {
    return () => {
      if (fadeTimeoutRef.current) {
        clearTimeout(fadeTimeoutRef.current);
      }
      if (authStackRafRef.current !== null) {
        window.cancelAnimationFrame(authStackRafRef.current);
        authStackRafRef.current = null;
      }
    };
  }, []);

  return (
    <div className="auth-page flex min-h-[100dvh] items-center overflow-y-auto px-4 py-4 text-[var(--foreground)] sm:px-8 sm:py-6">
      <div className="auth-shell neo-panel anim-fade-up mx-auto w-full max-w-6xl overflow-hidden rounded-[2rem]">
        <div className="auth-layout grid min-h-[78dvh] md:grid-cols-[1.2fr_0.95fr]">
          <section className="auth-hero relative hidden overflow-hidden px-6 py-7 md:block md:border-r md:border-[var(--line)] md:px-8 md:py-9">
            <span
              className="neo-orb h-52 w-52"
              style={{
                right: "-3.5rem",
                top: "-4rem",
                background: "radial-gradient(circle, var(--glow-a), transparent 70%)",
              }}
            />
            <span
              className="neo-orb h-72 w-72"
              style={{
                left: "-5rem",
                bottom: "-8rem",
                background: "radial-gradient(circle, var(--glow-b), transparent 72%)",
                animationDelay: "-6s",
              }}
            />

            <div className="auth-hero-content">
              <p className="neo-kicker">Shelf</p>
              <h1 className="neo-heading mt-2 max-w-xl text-[1.72rem] leading-[0.92] sm:mt-3 sm:text-6xl md:text-7xl">
                Stock clarity for every home.
              </h1>
              <p className="mt-3 max-w-xl text-[0.84rem] leading-relaxed text-[var(--muted)] sm:mt-4 sm:text-base">
                Track what is available, low, and shared. One private household space
                that feels calm on phone and desktop.
              </p>
              <div className="auth-feature-list mt-5 hidden sm:grid">
                <p className="auth-feature-item">
                  <span className="auth-feature-dot" />
                  Instant shared updates
                </p>
                <p className="auth-feature-item">
                  <span className="auth-feature-dot" />
                  Invite-only household access
                </p>
                <p className="auth-feature-item">
                  <span className="auth-feature-dot" />
                  Designed for quick daily edits
                </p>
              </div>
              <div className="auth-mobile-pill-row mt-4 hidden sm:flex">
                <span className="neo-chip">Private</span>
                <span className="neo-chip">Realtime</span>
                <span className="neo-chip">Shared</span>
              </div>
            </div>
          </section>

          <section className="auth-access px-5 py-7 sm:px-7 md:px-8 md:py-9">
            <div className="auth-access-head">
              <p className="neo-kicker">Shelf access</p>
              <span className="auth-access-badge">Secure entry</span>
            </div>
            <h2 className="neo-heading mt-2 text-[1.28rem] leading-[0.98] sm:text-4xl">
              {accessHeadline}
            </h2>
            <p className="mt-1 text-[0.78rem] leading-relaxed text-[var(--muted)] sm:mt-2 sm:text-sm">
              Choose your role to continue.
            </p>

            {pendingMessage ? (
              <div className="neo-panel-strong mt-4 rounded-2xl px-3 py-2 text-sm text-[var(--muted)]">
                {pendingMessage}
              </div>
            ) : null}

            <div
              className="auth-tabs mt-4 rounded-full border border-[var(--line)] sm:mt-5"
              style={{ background: "color-mix(in oklab, var(--panel) 76%, transparent)" }}
            >
              <span
                className="auth-tab-slider"
                style={{ transform: `translateX(${activeTabIndex * 100}%)` }}
                aria-hidden="true"
              />
              {([
                { id: "create", label: "Create" },
                { id: "login", label: "Login" },
                { id: "member", label: "Member" },
              ] as const).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleTabChange(item.id)}
                  className={`auth-tab-trigger rounded-full px-2 py-2 text-[0.68rem] font-semibold uppercase tracking-[0.1em] transition duration-200 sm:text-xs ${
                    tab === item.id
                      ? "text-[var(--primary-contrast)]"
                      : "text-[var(--muted)] hover:text-[var(--foreground)]"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <div
              ref={authStackRef}
              className="auth-tab-stack auth-stack-animate auth-forms mt-4 sm:mt-5"
              data-transitioning={isTabTransitioning}
              style={authStackHeight !== null ? { height: `${authStackHeight}px` } : undefined}
            >
              <div
                className="auth-tab"
                data-active={tab === "create"}
                data-leaving={leavingTab === "create"}
                aria-hidden={tab !== "create"}
              >
                <form onSubmit={handleOwnerCreate} className="auth-tab-content grid gap-4">
                  <div>
                    <label className="neo-kicker">Display name</label>
                    <input
                      value={ownerCreate.displayName}
                      onChange={(event) =>
                        setOwnerCreate((state) => ({
                          ...state,
                          displayName: event.target.value,
                        }))
                      }
                      placeholder="Name"
                      autoComplete="name"
                      className="neo-input mt-2"
                    />
                  </div>
                  <div>
                    <label className="neo-kicker">Email</label>
                    <input
                      type="email"
                      value={ownerCreate.email}
                      onChange={(event) =>
                        setOwnerCreate((state) => ({
                          ...state,
                          email: event.target.value,
                        }))
                      }
                      placeholder="You@example.com"
                      autoComplete="email"
                      className="neo-input mt-2"
                    />
                  </div>
                  <div>
                    <label className="neo-kicker">Password</label>
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
                      autoComplete="new-password"
                      className="neo-input mt-2"
                    />
                  </div>
                  {ownerCreateError ? (
                    <p className="text-sm text-[var(--danger)]">{ownerCreateError}</p>
                  ) : null}
                  <button type="submit" disabled={busy} className="neo-btn w-full">
                    Create household
                  </button>
                </form>
              </div>

              <div
                className="auth-tab"
                data-active={tab === "login"}
                data-leaving={leavingTab === "login"}
                aria-hidden={tab !== "login"}
              >
                <form onSubmit={handleOwnerLogin} className="auth-tab-content grid gap-4">
                  <div>
                    <label className="neo-kicker">Email</label>
                    <input
                      type="email"
                      value={ownerLogin.email}
                      onChange={(event) =>
                        setOwnerLogin((state) => ({
                          ...state,
                          email: event.target.value,
                        }))
                      }
                      placeholder="You@example.com"
                      autoComplete="username"
                      className="neo-input mt-2"
                    />
                  </div>
                  <div>
                    <label className="neo-kicker">Password</label>
                    <input
                      type="password"
                      value={ownerLogin.password}
                      onChange={(event) =>
                        setOwnerLogin((state) => ({
                          ...state,
                          password: event.target.value,
                        }))
                      }
                      placeholder="Password"
                      autoComplete="current-password"
                      className="neo-input mt-2"
                    />
                  </div>
                  {ownerLoginError ? (
                    <p className="text-sm text-[var(--danger)]">{ownerLoginError}</p>
                  ) : null}
                  <button type="submit" disabled={busy} className="neo-btn w-full">
                    Log in
                  </button>
                </form>
              </div>

              <div
                className="auth-tab"
                data-active={tab === "member"}
                data-leaving={leavingTab === "member"}
                aria-hidden={tab !== "member"}
              >
                <div className="auth-tab-content grid gap-4">
                  {memberStep === "email" ? (
                    <form onSubmit={handleMemberContinue} className="grid gap-4">
                      <div>
                        <label className="neo-kicker">Email</label>
                        <input
                          type="email"
                          value={memberEmailInput}
                          onChange={(event) => setMemberEmailInput(event.target.value)}
                          placeholder="You@example.com"
                          autoComplete="email"
                          className="neo-input mt-2"
                        />
                      </div>
                      {memberError ? (
                        <p className="text-sm text-[var(--danger)]">{memberError}</p>
                      ) : null}
                      <button type="submit" className="neo-btn-ghost w-full">
                        Continue
                      </button>
                    </form>
                  ) : null}

                  {memberStep === "signup" ? (
                    <form onSubmit={handleMemberSignup} className="grid gap-4">
                      <div className="neo-chip justify-self-start">{memberEmail}</div>
                      <div>
                        <label className="neo-kicker">Display name</label>
                        <input
                          value={memberForm.displayName}
                          onChange={(event) =>
                            setMemberForm((state) => ({
                              ...state,
                              displayName: event.target.value,
                            }))
                          }
                          placeholder="Name"
                          autoComplete="name"
                          className="neo-input mt-2"
                        />
                      </div>
                      <div>
                        <label className="neo-kicker">Password</label>
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
                          autoComplete="new-password"
                          className="neo-input mt-2"
                        />
                      </div>
                      {memberError ? (
                        <p className="text-sm text-[var(--danger)]">{memberError}</p>
                      ) : null}
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setMemberStep("email");
                            setMemberEmail(null);
                            setMemberError(null);
                          }}
                          className="neo-btn-ghost"
                        >
                          Change email
                        </button>
                        <button type="submit" disabled={busy} className="neo-btn">
                          Set password
                        </button>
                      </div>
                    </form>
                  ) : null}

                  {memberStep === "signin" ? (
                    <form onSubmit={handleMemberSignin} className="grid gap-4">
                      <div className="neo-chip justify-self-start">{memberEmail}</div>
                      <div>
                        <label className="neo-kicker">Password</label>
                        <input
                          type="password"
                          value={memberForm.password}
                          onChange={(event) =>
                            setMemberForm((state) => ({
                              ...state,
                              password: event.target.value,
                            }))
                          }
                          autoComplete="current-password"
                          className="neo-input mt-2"
                        />
                      </div>
                      {memberError ? (
                        <p className="text-sm text-[var(--danger)]">{memberError}</p>
                      ) : null}
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setMemberStep("email");
                            setMemberEmail(null);
                            setMemberError(null);
                          }}
                          className="neo-btn-ghost"
                        >
                          Change email
                        </button>
                        <button type="submit" disabled={busy} className="neo-btn">
                          Log in
                        </button>
                      </div>
                    </form>
                  ) : null}
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
