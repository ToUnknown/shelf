"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import {
  useAction,
  useConvexAuth,
  useMutation,
  useQuery,
} from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { api } from "../convex/_generated/api";
import ProductForm from "../components/ProductForm";
import ProductListItem from "../components/ProductListItem";
import AuthScreen from "../components/AuthScreen";
import type { Product, ProductInput } from "../lib/productTypes";
import { draftFromProduct } from "../lib/productForm";
import type { Doc, Id } from "../convex/_generated/dataModel";

export default function Home() {
  const auth = useConvexAuth();
  const currentUser = useQuery(
    api.users.getCurrent,
    auth.isAuthenticated ? {} : "skip",
  );
  const isReady = Boolean(
    auth.isAuthenticated && currentUser?.role && currentUser?.householdId,
  );
  const isLoadingUser = auth.isAuthenticated && currentUser === undefined;

  const products = useQuery(api.products.list, isReady ? {} : "skip");
  const createProduct = useMutation(api.products.create);
  const updateProduct = useMutation(api.products.update);
  const removeProduct = useMutation(api.products.remove);
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
  const { signOut } = useAuthActions();

  const isLoading = products === undefined;
  const [search, setSearch] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const isModalOpen =
    isAddOpen || Boolean(editingProduct) || isSettingsOpen;

  const [profileName, setProfileName] = useState("");
  const [profileApiKey, setProfileApiKey] = useState("");
  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const [profileBusy, setProfileBusy] = useState(false);

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteMessage, setInviteMessage] = useState<string | null>(null);
  const [inviteBusy, setInviteBusy] = useState(false);
  const [memberMessage, setMemberMessage] = useState<string | null>(null);
  const [memberBusyId, setMemberBusyId] = useState<Id<"users"> | null>(null);
  const [dangerBusy, setDangerBusy] = useState(false);
  const [verificationBusy, setVerificationBusy] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [verificationMessage, setVerificationMessage] = useState<string | null>(
    null,
  );

  const isEmailVerified = Boolean(currentUser?.appEmailVerifiedAt);

  useEffect(() => {
    if (!currentUser) return;
    setProfileName(currentUser.displayName ?? "");
    setProfileApiKey(currentUser.apiKey ?? "");
  }, [currentUser]);

  const filteredProducts = useMemo(() => {
    const list = products ?? [];
    const query = search.trim().toLowerCase();
    if (!query) return list;
    return list.filter((product: Product) => {
      return (
        product.name.toLowerCase().includes(query) ||
        product.tag.toLowerCase().includes(query) ||
        product.amount.unit.toLowerCase().includes(query)
      );
    });
  }, [products, search]);

  const handleCreate = async (input: ProductInput) => {
    await createProduct(input);
  };

  const handleUpdate = async (id: Product["_id"], input: ProductInput) => {
    await updateProduct({ id, ...input });
  };

  const handleDelete = async (id: Product["_id"]) => {
    await removeProduct({ id });
  };

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
    if (resendCooldown > 0) {
      return;
    }
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

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timeoutId = setTimeout(() => {
      setResendCooldown((current) => Math.max(0, current - 1));
    }, 1000);
    return () => clearTimeout(timeoutId);
  }, [resendCooldown]);

  const handleRemoveMember = async (memberId: Id<"users">, label: string) => {
    if (!confirm(`Delete ${label}'s account from this household?`)) {
      return;
    }
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

  const handleLeaveHousehold = async () => {
    if (
      !confirm(
        "Leaving household will permanently delete your account. Continue?",
      )
    ) {
      return;
    }
    setDangerBusy(true);
    try {
      await leaveHousehold({});
      await signOut();
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
      <div className="flex min-h-screen items-center justify-center bg-[var(--background)] text-sm text-slate-500 dark:text-slate-400">
        Loading session...
      </div>
    );
  }

  if (!isReady) {
    return <AuthScreen isLoadingUser={isLoadingUser} />;
  }

  if (!isEmailVerified) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--background)] px-4 py-10 text-slate-900 dark:text-slate-100">
        <div className="w-full max-w-xl rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-2xl dark:border-slate-700 dark:bg-slate-900/90 sm:p-8 anim-pop">
          <p className="text-xs font-semibold uppercase tracking-[0.4em] text-slate-500 dark:text-slate-400">
            Shelf
          </p>
          <h1 className="mt-3 text-2xl font-semibold text-slate-900 dark:text-slate-100">
            Email not verified
          </h1>
          <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
            Confirm your email to unlock the app. We sent a verification link to{" "}
            {currentUser?.email}.
          </p>
          {verificationMessage ? (
            <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
              {verificationMessage}
            </p>
          ) : null}
          <div className="mt-6 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => signOut()}
              className="text-sm font-semibold text-slate-500 transition hover:text-slate-700 dark:text-slate-400"
            >
              Sign out
            </button>
            <button
              type="button"
              onClick={handleResendVerification}
              disabled={verificationBusy || resendCooldown > 0}
              className="rounded-full border border-slate-900 bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 hover:border-slate-800 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-100 dark:bg-slate-100 dark:text-slate-900 dark:hover:border-white dark:hover:bg-white"
            >
              {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend email"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[100lvh] min-h-[100lvh] overflow-hidden bg-[var(--background)] px-6 pt-8 pb-0 text-slate-900 dark:text-slate-100 sm:pt-12">
      <main className="mx-auto flex h-full min-h-0 w-full max-w-5xl flex-col gap-6">
        <div
          className={`flex min-h-0 flex-1 flex-col gap-6 transition-opacity duration-200 ${
            isModalOpen ? "opacity-20" : "opacity-100"
          }`}
        >
          <header
            className="flex flex-wrap items-end justify-between gap-6 anim-fade-up"
            style={{ animationDelay: "40ms" }}
          >
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.4em] text-slate-500 dark:text-slate-400">
                MVP
              </p>
              <h1 className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-100 md:text-4xl">
                Shelf
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Welcome, {currentUser?.displayName ?? ""}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="rounded-full border border-slate-200 bg-white/70 px-4 py-2 text-xs font-semibold text-slate-500 shadow-sm dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-400 anim-pop">
                {isLoading ? "Loading..." : `${products?.length ?? 0} products`}
              </div>
              <button
                type="button"
                onClick={() => setIsSettingsOpen(true)}
                className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
              >
                Settings
              </button>
            </div>
          </header>

          <section className="flex min-h-0 flex-1 flex-col">
            <div
              className="relative flex min-h-10 flex-nowrap items-center justify-between gap-4 sm:flex-wrap anim-fade-up"
              style={{ animationDelay: "80ms" }}
            >
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                List of products
              </h2>
              <div className="flex flex-wrap items-center gap-3">
                <label className="group relative hidden items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600 shadow-sm focus-within:border-slate-400 focus-within:ring-2 focus-within:ring-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:focus-within:border-slate-500 dark:focus-within:ring-slate-800 sm:flex">
                  <span className="text-slate-400 dark:text-slate-500" aria-hidden="true">
                    <svg
                      viewBox="0 0 20 20"
                      fill="none"
                      className="h-4 w-4"
                      stroke="currentColor"
                      strokeWidth="1.6"
                    >
                      <circle cx="9" cy="9" r="5.75" />
                      <path d="M13.5 13.5L17 17" strokeLinecap="round" />
                    </svg>
                  </span>
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search products..."
                    className="w-52 bg-transparent pr-7 text-sm text-slate-800 outline-none placeholder:text-slate-400 dark:text-slate-100 dark:placeholder:text-slate-500"
                  />
                  {search && (
                    <button
                      type="button"
                      onClick={() => setSearch("")}
                      className="absolute right-3 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-slate-400 transition hover:text-slate-600 active:scale-95 dark:text-slate-500 dark:hover:text-slate-300"
                      aria-label="Clear search"
                    >
                      <svg
                        viewBox="0 0 20 20"
                        fill="none"
                        className="h-4 w-4"
                        stroke="currentColor"
                        strokeWidth="1.8"
                      >
                        <path d="M5 5l10 10M15 5l-10 10" strokeLinecap="round" />
                      </svg>
                    </button>
                  )}
                </label>
                {!isSearchOpen && (
                  <button
                    type="button"
                    onClick={() => setIsSearchOpen(true)}
                    className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:border-slate-300 hover:-translate-y-0.5 active:scale-95 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400 dark:hover:border-slate-600 sm:hidden"
                    aria-label="Open search"
                  >
                    <svg
                      viewBox="0 0 20 20"
                      fill="none"
                      className="h-4 w-4"
                      stroke="currentColor"
                      strokeWidth="1.6"
                    >
                      <circle cx="9" cy="9" r="5.75" />
                      <path d="M13.5 13.5L17 17" strokeLinecap="round" />
                    </svg>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsAddOpen(true)}
                  className={`relative z-20 h-10 w-10 items-center justify-center rounded-full bg-slate-900 text-2xl font-semibold leading-none text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-800 active:scale-95 ${
                    isSearchOpen ? "hidden sm:flex" : "flex"
                  } dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white`}
                  aria-label="Add product"
                >
                  +
                </button>
              </div>
              {isSearchOpen && (
                <div className="absolute inset-y-0 left-0 right-0 z-30 flex items-center gap-3 bg-transparent sm:hidden anim-pop">
                  <label className="flex flex-1 items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600 shadow-sm focus-within:border-slate-400 focus-within:ring-2 focus-within:ring-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:focus-within:border-slate-500 dark:focus-within:ring-slate-800">
                    <span className="text-slate-400 dark:text-slate-500" aria-hidden="true">
                      <svg
                        viewBox="0 0 20 20"
                        fill="none"
                        className="h-4 w-4"
                        stroke="currentColor"
                        strokeWidth="1.6"
                      >
                        <circle cx="9" cy="9" r="5.75" />
                        <path d="M13.5 13.5L17 17" strokeLinecap="round" />
                      </svg>
                    </span>
                    <input
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder="Search products..."
                      className="flex-1 bg-transparent text-base text-slate-800 outline-none placeholder:text-slate-400 dark:text-slate-100 dark:placeholder:text-slate-500 sm:text-sm"
                      autoFocus
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsSearchOpen(false)}
                    className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:border-slate-300 hover:-translate-y-0.5 active:scale-95 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400 dark:hover:border-slate-600"
                    aria-label="Close search"
                  >
                    <svg
                      viewBox="0 0 20 20"
                      fill="none"
                      className="h-4 w-4"
                      stroke="currentColor"
                      strokeWidth="1.8"
                    >
                      <path d="M5 5l10 10M15 5l-10 10" strokeLinecap="round" />
                    </svg>
                  </button>
                </div>
              )}
            </div>

            <div
              className="relative mt-4 flex-1 min-h-0 overflow-hidden anim-fade-up"
              style={{ animationDelay: "120ms" }}
            >
              <div className="h-full min-h-0 overflow-y-auto overscroll-contain no-scrollbar scroll-clip list-fade-edges pb-24 sm:pb-16">
                <div className="grid gap-4 pt-2">
                  {isLoading ? (
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-white/70 p-10 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-400 anim-fade-up">
                      Loading products...
                    </div>
                  ) : filteredProducts.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-white/70 p-10 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-400 anim-fade-up">
                      No products yet. Add your first item above.
                    </div>
                  ) : (
                    filteredProducts.map((product: Product, index: number) => (
                      <div
                        key={product._id}
                        className="stagger-item"
                        style={
                          {
                            "--stagger": `${Math.min(index, 12) * 40}ms`,
                          } as CSSProperties
                        }
                      >
                        <ProductListItem
                          product={product}
                          onSelect={setEditingProduct}
                        />
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </section>
        </div>

        {isAddOpen && (
          <>
            <div
              className="fixed inset-0 z-40 bg-transparent"
              onClick={() => setIsAddOpen(false)}
              aria-hidden="true"
            />
            <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto px-4 py-6 sm:py-8">
              <div className="relative w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl dark:border-slate-700 dark:bg-slate-900 sm:rounded-3xl sm:p-6 anim-pop">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.4em] text-slate-400 dark:text-slate-500">
                      Add product
                    </p>
                    <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                      New inventory item
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsAddOpen(false)}
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-lg font-semibold text-slate-500 transition hover:-translate-y-0.5 hover:border-slate-300 hover:text-slate-700 active:scale-95 dark:border-slate-700 dark:text-slate-400 dark:hover:border-slate-500 dark:hover:text-slate-200"
                    aria-label="Close"
                  >
                    ×
                  </button>
                </div>

                <div className="mt-5">
                  <ProductForm
                    onSubmit={async (input) => {
                      await handleCreate(input);
                      setIsAddOpen(false);
                    }}
                    existingProducts={products ?? []}
                    onSelectExisting={(product) => {
                      setIsAddOpen(false);
                      setEditingProduct(product);
                    }}
                    enableSuggestions
                    submitLabel="Add product"
                  />
                </div>
              </div>
            </div>
          </>
        )}

        {editingProduct && (
          <>
            <div
              className="fixed inset-0 z-40 bg-transparent"
              onClick={() => setEditingProduct(null)}
              aria-hidden="true"
            />
            <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto px-4 py-6 sm:py-8">
              <div className="relative w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl dark:border-slate-700 dark:bg-slate-900 sm:rounded-3xl sm:p-6 anim-pop">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.4em] text-slate-400 dark:text-slate-500">
                      Edit product
                    </p>
                    <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                      {editingProduct.name}
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditingProduct(null)}
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-lg font-semibold text-slate-500 transition hover:-translate-y-0.5 hover:border-slate-300 hover:text-slate-700 active:scale-95 dark:border-slate-700 dark:text-slate-400 dark:hover:border-slate-500 dark:hover:text-slate-200"
                    aria-label="Close"
                  >
                    ×
                  </button>
                </div>

                <div className="mt-5 grid gap-4">
                  <ProductForm
                    onSubmit={async (input) => {
                      await handleUpdate(editingProduct._id, input);
                      setEditingProduct(null);
                    }}
                    initialDraft={draftFromProduct(editingProduct)}
                    submitLabel="Save changes"
                    actionsAlign="right"
                    leadingAction={
                      <button
                        type="button"
                        onClick={async () => {
                          await handleDelete(editingProduct._id);
                          setEditingProduct(null);
                        }}
                        className="whitespace-nowrap rounded-full border border-rose-200 px-3 py-2 text-sm font-semibold text-rose-600 transition hover:-translate-y-0.5 hover:bg-rose-50 active:scale-95 dark:border-rose-500/40 dark:text-rose-300 dark:hover:bg-rose-500/10 sm:px-4 sm:py-2 sm:text-sm"
                      >
                        Delete
                      </button>
                    }
                  />
                </div>
              </div>
            </div>
          </>
        )}

        {isSettingsOpen && (
          <>
            <div
              className="fixed inset-0 z-40 bg-transparent"
              onClick={() => setIsSettingsOpen(false)}
              aria-hidden="true"
            />
            <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto px-4 py-6 sm:py-8">
              <div className="relative w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl dark:border-slate-700 dark:bg-slate-900 sm:rounded-3xl sm:p-6 anim-pop">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.4em] text-slate-400 dark:text-slate-500">
                      Settings
                    </p>
                    <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                      Account
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsSettingsOpen(false)}
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-lg font-semibold text-slate-500 transition hover:-translate-y-0.5 hover:border-slate-300 hover:text-slate-700 active:scale-95 dark:border-slate-700 dark:text-slate-400 dark:hover:border-slate-500 dark:hover:text-slate-200"
                    aria-label="Close"
                  >
                    ×
                  </button>
                </div>

                <div className="mt-5 grid gap-5">
                  <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white/70 p-4 dark:border-slate-700 dark:bg-slate-900/70">
                    <div>
                      <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                        Display name
                      </label>
                      <input
                        value={profileName}
                        onChange={(event) => setProfileName(event.target.value)}
                        className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-base text-slate-900 shadow-sm transition focus:border-slate-400 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                        API key
                      </label>
                      <input
                        value={profileApiKey}
                        onChange={(event) => setProfileApiKey(event.target.value)}
                        className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-base text-slate-900 shadow-sm transition focus:border-slate-400 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                      />
                    </div>
                    {profileMessage ? (
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        {profileMessage}
                      </p>
                    ) : null}
                    <div className="flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => signOut()}
                        className="text-sm font-semibold text-slate-500 transition hover:text-slate-700 dark:text-slate-400"
                      >
                        Sign out
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveProfile}
                        disabled={profileBusy}
                        className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-100 dark:text-slate-900"
                      >
                        Save
                      </button>
                    </div>
                  </div>

                  {currentUser?.role === "owner" ? (
                    <>
                      <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white/70 p-4 dark:border-slate-700 dark:bg-slate-900/70">
                        <div>
                          <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                            Invite member
                          </label>
                          <div className="mt-2 flex flex-wrap gap-2">
                            <input
                              value={inviteEmail}
                              onChange={(event) => setInviteEmail(event.target.value)}
                              placeholder="member@example.com"
                              className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-base text-slate-900 shadow-sm transition focus:border-slate-400 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                            />
                            <button
                              type="button"
                              onClick={handleInvite}
                              disabled={inviteBusy}
                              className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:-translate-y-0.5 hover:border-slate-300 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slate-200"
                            >
                              Send
                            </button>
                          </div>
                        </div>
                        {inviteMessage ? (
                          <p className="text-sm text-slate-500 dark:text-slate-400">
                            {inviteMessage}
                          </p>
                        ) : null}
                        <div className="grid gap-2">
                          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
                            Invites
                          </p>
                          {invites === undefined ? (
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                              Loading invites...
                            </p>
                          ) : invites.length === 0 ? (
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                              No invites yet.
                            </p>
                          ) : (
                            invites.map((invite: Doc<"memberInvites">) => (
                              <div
                                key={invite._id}
                                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                              >
                                <div>
                                  <p className="font-semibold text-slate-900 dark:text-slate-100">
                                    {invite.email}
                                  </p>
                                  <p className="text-xs text-slate-400 dark:text-slate-500">
                                    {invite.status}
                                  </p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => revokeInvite({ email: invite.email })}
                                  className="text-xs font-semibold text-rose-500 transition hover:text-rose-600"
                                >
                                  Revoke
                                </button>
                              </div>
                            ))
                          )}
                        </div>
                      </div>

                      <div className="grid gap-2 rounded-2xl border border-slate-200 bg-white/70 p-4 dark:border-slate-700 dark:bg-slate-900/70">
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
                          Members
                        </p>
                        {members === undefined ? (
                          <p className="text-sm text-slate-500 dark:text-slate-400">
                            Loading members...
                          </p>
                        ) : members.length === 0 ? (
                          <p className="text-sm text-slate-500 dark:text-slate-400">
                            No members yet.
                          </p>
                        ) : (
                          members.map((member: Doc<"users">) => (
                            <div
                              key={member._id}
                              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                            >
                              <div>
                                <p className="font-semibold text-slate-900 dark:text-slate-100">
                                  {member.displayName || member.email || "Member"}
                                </p>
                                <p className="text-xs text-slate-400 dark:text-slate-500">
                                  {member.email || "No email"}
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() =>
                                  handleRemoveMember(
                                    member._id,
                                    member.displayName || member.email || "member",
                                  )
                                }
                                disabled={memberBusyId === member._id}
                                className="text-xs font-semibold text-rose-500 transition hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                Remove
                              </button>
                            </div>
                          ))
                        )}
                        {memberMessage ? (
                          <p className="text-sm text-slate-500 dark:text-slate-400">
                            {memberMessage}
                          </p>
                        ) : null}
                      </div>

                      <div className="grid gap-2 rounded-2xl border border-rose-200 bg-rose-50/60 p-4 dark:border-rose-500/30 dark:bg-rose-500/10">
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-rose-500 dark:text-rose-300">
                          Danger zone
                        </p>
                        <p className="text-sm text-rose-600 dark:text-rose-300">
                          Deleting owner account will remove this household and all member accounts.
                        </p>
                        <button
                          type="button"
                          onClick={handleDeleteOwnerAccount}
                          disabled={dangerBusy}
                          className="justify-self-start rounded-full border border-rose-300 px-4 py-2 text-sm font-semibold text-rose-600 transition hover:-translate-y-0.5 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-rose-400/50 dark:text-rose-300 dark:hover:bg-rose-500/20"
                        >
                          Delete household
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="grid gap-2 rounded-2xl border border-rose-200 bg-rose-50/60 p-4 dark:border-rose-500/30 dark:bg-rose-500/10">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-rose-500 dark:text-rose-300">
                        Danger zone
                      </p>
                      <p className="text-sm text-rose-600 dark:text-rose-300">
                        Leaving household permanently deletes your account.
                      </p>
                      <button
                        type="button"
                        onClick={handleLeaveHousehold}
                        disabled={dangerBusy}
                        className="justify-self-start rounded-full border border-rose-300 px-4 py-2 text-sm font-semibold text-rose-600 transition hover:-translate-y-0.5 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-rose-400/50 dark:text-rose-300 dark:hover:bg-rose-500/20"
                      >
                        Leave household
                      </button>
                      {memberMessage ? (
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                          {memberMessage}
                        </p>
                      ) : null}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
