"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import {
  useConvexAuth,
  useMutation,
  useQuery,
} from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { useRouter } from "next/navigation";
import { api } from "../convex/_generated/api";
import ProductForm from "../components/ProductForm";
import ProductListItem from "../components/ProductListItem";
import AuthScreen from "../components/AuthScreen";
import type { Product, ProductInput } from "../lib/productTypes";
import { draftFromProduct } from "../lib/productForm";

const DEFAULT_TAG = "#other";
const LEGACY_TAG = "#uncategorized";

const normalizeCategoryTag = (rawTag: string) => {
  const trimmed = rawTag.trim();
  if (!trimmed) return DEFAULT_TAG;
  const normalized = trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
  if (normalized.toLowerCase() === LEGACY_TAG) {
    return DEFAULT_TAG;
  }
  return normalized;
};

const formatNumber = (value: number) => {
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
};

const formatAmount = (value: number, unit: string) => {
  const normalizedUnit = unit.trim().toLowerCase();
  if (normalizedUnit === "g" && value >= 1000) {
    return `${formatNumber(value / 1000)} kg`;
  }
  if (normalizedUnit === "ml" && value >= 1000) {
    return `${formatNumber(value / 1000)} l`;
  }
  if (normalizedUnit === "grams") {
    return `${formatNumber(value)} g`;
  }
  if (normalizedUnit === "milliliters") {
    return `${formatNumber(value)} ml`;
  }
  return `${formatNumber(value)} ${normalizedUnit}`;
};

const writeToClipboard = async (text: string) => {
  if (
    typeof window !== "undefined" &&
    typeof navigator !== "undefined" &&
    navigator.clipboard &&
    window.isSecureContext
  ) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  textarea.style.top = "-9999px";
  document.body.appendChild(textarea);
  textarea.select();
  const ok = document.execCommand("copy");
  document.body.removeChild(textarea);
  if (!ok) {
    throw new Error("Could not copy to clipboard.");
  }
};

export default function Home() {
  const router = useRouter();
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
  const resendVerificationEmail = useMutation(api.users.resendVerificationEmail);
  const { signOut } = useAuthActions();

  const isLoading = products === undefined;
  const [search, setSearch] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [pendingDeleteProduct, setPendingDeleteProduct] = useState<Product | null>(
    null,
  );
  const [isDeletingProduct, setIsDeletingProduct] = useState(false);
  const [isCopyOpen, setIsCopyOpen] = useState(false);
  const [copyMessage, setCopyMessage] = useState<string | null>(null);
  const isModalOpen =
    isAddOpen || Boolean(editingProduct) || Boolean(pendingDeleteProduct);
  const productScrollRef = useRef<HTMLDivElement | null>(null);
  const [productScrollFade, setProductScrollFade] = useState({
    top: false,
    bottom: false,
  });
  const [verificationBusy, setVerificationBusy] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [verificationMessage, setVerificationMessage] = useState<string | null>(
    null,
  );

  const isEmailVerified = Boolean(currentUser?.appEmailVerifiedAt);

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

  const productCategories = useMemo(() => {
    const list = products ?? [];
    const map = new Map<string, string>();
    for (const product of list) {
      const label = normalizeCategoryTag(product.tag);
      const key = label.toLowerCase();
      if (!map.has(key)) {
        map.set(key, label);
      }
    }
    const categories = Array.from(map.entries()).map(([key, label]) => ({
      key,
      label,
    }));
    categories.sort((a, b) => a.label.localeCompare(b.label));
    return categories;
  }, [products]);

  const greetingText = currentUser?.displayName
    ? `Hi, ${currentUser.displayName}. What are you looking for today?`
    : "Welcome. What are you looking for today?";

  const renderCopyMenu = (menuClass: string) => (
    <>
      <div
        className="fixed inset-0 z-30"
        onClick={() => setIsCopyOpen(false)}
        aria-hidden="true"
      />
      <div
        role="menu"
        className={`neo-panel-strong absolute z-40 rounded-2xl p-2 anim-pop ${menuClass}`}
      >
        <button
          type="button"
          role="menuitem"
          onClick={() => handleCopy("all products", products ?? [])}
          className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm font-semibold text-[var(--foreground)] transition duration-200 hover:-translate-y-0.5 hover:bg-white/10 active:scale-[0.99]"
        >
          All products
          <span className="text-xs text-[var(--muted)]">{products?.length ?? 0}</span>
        </button>
        {productCategories.length > 0 ? (
          <>
            <div className="neo-divider my-2" />
            <p className="neo-kicker px-3 pb-1">Categories</p>
            <div className="max-h-56 overflow-auto no-scrollbar">
              {productCategories.map(({ key, label }) => {
                const list = (products ?? []).filter(
                  (product) =>
                    normalizeCategoryTag(product.tag).toLowerCase() === key,
                );
                return (
                  <button
                    key={key}
                    type="button"
                    role="menuitem"
                    onClick={() => handleCopy(label, list)}
                    className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm text-[var(--muted)] transition duration-200 hover:-translate-y-0.5 hover:bg-white/10 active:scale-[0.99]"
                  >
                    <span className="font-semibold text-[var(--foreground)]">
                      {label}
                    </span>
                    <span className="text-xs">{list.length}</span>
                  </button>
                );
              })}
            </div>
          </>
        ) : null}
      </div>
    </>
  );

  useEffect(() => {
    if (!isCopyOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsCopyOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isCopyOpen]);

  useEffect(() => {
    if (!copyMessage) return;
    const timeoutId = setTimeout(() => setCopyMessage(null), 2200);
    return () => clearTimeout(timeoutId);
  }, [copyMessage]);

  useEffect(() => {
    if (!isModalOpen) return;
    setIsCopyOpen(false);
  }, [isModalOpen]);

  useEffect(() => {
    const node = productScrollRef.current;
    if (!node) return;

    const updateFade = () => {
      const top = node.scrollTop > 4;
      const bottom = node.scrollTop + node.clientHeight < node.scrollHeight - 4;
      setProductScrollFade({ top, bottom });
    };

    updateFade();
    node.addEventListener("scroll", updateFade, { passive: true });
    window.addEventListener("resize", updateFade);
    return () => {
      node.removeEventListener("scroll", updateFade);
      window.removeEventListener("resize", updateFade);
    };
  }, [filteredProducts.length, isLoading]);

  const handleCopy = async (label: string, list: Product[]) => {
    if (list.length === 0) {
      setCopyMessage("Nothing to copy.");
      return;
    }
    const lines = [...list]
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((product) => {
        const name = product.name.trim();
        return `${name} — ${formatAmount(product.amount.value, product.amount.unit)}`;
      });
    try {
      await writeToClipboard(lines.join("\n"));
      setCopyMessage(`Copied ${label}.`);
      setIsCopyOpen(false);
    } catch (error) {
      setCopyMessage(
        error instanceof Error ? error.message : "Could not copy to clipboard.",
      );
    }
  };

  const handleCreate = async (input: ProductInput) => {
    await createProduct(input);
  };

  const handleUpdate = async (id: Product["_id"], input: ProductInput) => {
    await updateProduct({ id, ...input });
  };

  const handleConfirmDelete = async () => {
    if (!pendingDeleteProduct || isDeletingProduct) {
      return false;
    }
    setIsDeletingProduct(true);
    try {
      await removeProduct({ id: pendingDeleteProduct._id });
      if (editingProduct?._id === pendingDeleteProduct._id) {
        setEditingProduct(null);
      }
      setPendingDeleteProduct(null);
      return true;
    } catch (error) {
      setCopyMessage(
        error instanceof Error ? error.message : "Could not delete product.",
      );
      return false;
    } finally {
      setIsDeletingProduct(false);
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
      setResendCooldown((value) => Math.max(0, value - 1));
    }, 1000);
    return () => clearTimeout(timeoutId);
  }, [resendCooldown]);

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
          <span
            className="neo-orb h-56 w-56"
            style={{
              right: "-3.5rem",
              top: "-5rem",
              background: "radial-gradient(circle, var(--glow-a), transparent 72%)",
            }}
          />
          <p className="neo-kicker">Shelf</p>
          <h1 className="neo-heading mt-3 text-4xl leading-[0.92] sm:text-5xl">
            Verify your email
          </h1>
          <p className="mt-4 max-w-lg text-sm leading-relaxed text-[var(--muted)] sm:text-base">
            Confirm your email to unlock inventory access. We sent a verification
            link to {currentUser?.email}.
          </p>
          {verificationMessage ? (
            <p className="mt-4 text-sm text-[var(--muted)]">{verificationMessage}</p>
          ) : null}
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => signOut()}
              className="neo-btn-ghost"
            >
              Sign out
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

  return (
    <div className="h-[100dvh] min-h-[100dvh] overflow-hidden px-0 py-0 md:px-6 md:py-6">
      <main className="mx-auto h-full w-full max-w-7xl">
        <div
          className={`grid h-full min-h-0 gap-0 md:gap-4 md:grid-cols-[300px_1fr] ${
            isModalOpen ? "pointer-events-none opacity-30" : "opacity-100"
          } transition-opacity duration-200`}
        >
          <aside className="neo-panel anim-fade-up relative hidden rounded-[1.6rem] p-4 sm:p-5 md:block md:h-full md:min-h-0 md:overflow-hidden">
            <span
              className="neo-orb h-44 w-44"
              style={{
                right: "-3rem",
                top: "-4rem",
                background: "radial-gradient(circle, var(--glow-a), transparent 72%)",
              }}
            />
            <p className="neo-kicker">Inventory cockpit</p>
            <h1 className="neo-heading mt-2 text-4xl leading-[0.9]">Shelf</h1>
            <p className="mt-2 text-sm text-[var(--muted)]">{greetingText}</p>

            <div className="mt-4 grid gap-2 sm:grid-cols-3 lg:grid-cols-1">
              <button
                type="button"
                onClick={() => {
                  setIsCopyOpen(false);
                  setIsAddOpen(true);
                }}
                className="neo-btn w-full"
                aria-label="Add product"
              >
                Add item
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsCopyOpen(false);
                  router.push("/settings");
                }}
                className="neo-btn-ghost w-full"
              >
                Settings
              </button>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsCopyOpen((value) => !value)}
                  disabled={isLoading}
                  className="neo-btn-ghost w-full"
                  aria-haspopup="menu"
                  aria-expanded={isCopyOpen}
                >
                  Copy list
                </button>
                {isCopyOpen ? renderCopyMenu("left-0 right-0 top-11 w-full max-w-full") : null}
              </div>
            </div>

            <label className="relative mt-4 block">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--muted)]">
                <svg
                  viewBox="0 0 20 20"
                  fill="none"
                  className="h-4 w-4"
                  stroke="currentColor"
                  strokeWidth="1.8"
                >
                  <circle cx="9" cy="9" r="5.75" />
                  <path d="M13.5 13.5L17 17" strokeLinecap="round" />
                </svg>
              </span>
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search products..."
                className="neo-input neo-input-with-icons"
              />
              {search ? (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-2.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full border border-[var(--line)] text-[var(--muted)] transition hover:border-[var(--line-strong)] hover:text-[var(--foreground)]"
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
              ) : null}
            </label>
          </aside>

          <section className="mobile-main-surface neo-panel-strong anim-fade-up flex min-h-0 flex-col rounded-none p-0 md:rounded-[1.6rem] md:p-4">
            <div className="mobile-top-rail mobile-safe-inline flex md:hidden">
              <div className="min-w-0">
                <p className="neo-kicker">Shelf</p>
                <p className="mt-1 text-[0.82rem] leading-snug text-[var(--muted)]">
                  {greetingText}
                </p>
              </div>
              <div className="mobile-action-row">
                <button
                  type="button"
                  onClick={() => {
                    setIsCopyOpen(false);
                    setIsAddOpen(true);
                  }}
                  className="neo-icon-btn neo-icon-btn-primary"
                  aria-label="Add item"
                  title="Add item"
                >
                  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.9">
                    <path d="M10 4v12M4 10h12" strokeLinecap="round" />
                  </svg>
                </button>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsCopyOpen((value) => !value)}
                    disabled={isLoading}
                    className="neo-icon-btn"
                    aria-haspopup="menu"
                    aria-expanded={isCopyOpen}
                    aria-label="Copy list"
                    title="Copy list"
                  >
                    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7">
                      <rect x="7" y="7" width="9" height="9" rx="2" />
                      <rect x="4" y="4" width="9" height="9" rx="2" />
                    </svg>
                  </button>
                  {isCopyOpen
                    ? renderCopyMenu("right-0 top-12 w-[18rem] max-w-[calc(100vw-1.25rem)]")
                    : null}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsCopyOpen(false);
                    router.push("/settings");
                  }}
                  className="neo-icon-btn"
                  aria-label="Settings"
                  title="Settings"
                >
                  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7">
                    <path d="M4 6h12M4 10h12M4 14h12" strokeLinecap="round" />
                    <circle cx="7" cy="6" r="1.2" />
                    <circle cx="12.5" cy="10" r="1.2" />
                    <circle cx="9" cy="14" r="1.2" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="mobile-safe-inline mt-3 mb-2 flex items-center justify-between gap-3 px-0 md:mt-0 md:px-1">
              <h2 className="neo-heading text-xl sm:text-3xl">Products</h2>
              <div className="ml-auto text-right text-sm font-semibold text-[var(--muted)]">
                {search.trim()
                  ? `${filteredProducts.length}/${products?.length ?? 0} products`
                  : `${products?.length ?? 0} products`}
              </div>
            </div>
            <div className="mobile-safe-inline mb-2 md:hidden">
              <label className="relative block">
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--muted)]">
                  <svg
                    viewBox="0 0 20 20"
                    fill="none"
                    className="h-4 w-4"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  >
                    <circle cx="9" cy="9" r="5.75" />
                    <path d="M13.5 13.5L17 17" strokeLinecap="round" />
                  </svg>
                </span>
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search products..."
                  className="neo-input neo-input-with-icons"
                />
                {search ? (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    className="absolute right-2.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full border border-[var(--line)] text-[var(--muted)] transition hover:border-[var(--line-strong)] hover:text-[var(--foreground)]"
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
                ) : null}
              </label>
            </div>
            <div className="relative flex-1 min-h-0 overflow-hidden">
              <div
                ref={productScrollRef}
                className="mobile-list-scroll h-full min-h-0 overflow-y-auto overscroll-contain no-scrollbar md:scroll-clip md:pb-16"
              >
                <div className="grid gap-3 pt-2">
                  {isLoading ? (
                    <div className="neo-panel rounded-2xl p-10 text-center text-sm text-[var(--muted)]">
                      Loading products...
                    </div>
                  ) : filteredProducts.length === 0 ? (
                    <div className="flex min-h-[52vh] items-center justify-center px-4">
                      <div className="text-center text-[var(--muted)]">
                        <div className="mx-auto text-2xl text-[var(--muted)]">✦</div>
                        {search.trim() ? (
                          <>
                            <p className="mt-2 text-sm font-semibold text-[var(--foreground)]">
                              No matches found
                            </p>
                            <p className="mt-1 text-xs text-[var(--muted)]">
                              No items match “{search.trim()}”.
                            </p>
                          </>
                        ) : (
                          <>
                            <p className="mt-2 text-sm font-semibold text-[var(--foreground)]">
                              No products yet
                            </p>
                            <p className="mt-1 text-xs text-[var(--muted)]">
                              Add your first item to start tracking stock.
                            </p>
                          </>
                        )}
                      </div>
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
              <div
                className={`scroll-fade-overlay scroll-fade-overlay--list scroll-fade-overlay-top hidden md:block ${
                  productScrollFade.top ? "opacity-100" : "opacity-0"
                }`}
              />
              <div
                className={`scroll-fade-overlay scroll-fade-overlay--list scroll-fade-overlay-bottom hidden md:block ${
                  productScrollFade.bottom ? "opacity-100" : "opacity-0"
                }`}
              />
            </div>
          </section>
        </div>

        {copyMessage ? (
          <div className="neo-panel-strong anim-pop fixed bottom-6 left-1/2 z-[70] -translate-x-1/2 rounded-full px-4 py-2 text-sm font-semibold text-[var(--foreground)]">
            {copyMessage}
          </div>
        ) : null}

        {isAddOpen && (
          <>
            <div
              className="neo-modal-backdrop z-40"
              onClick={() => setIsAddOpen(false)}
              aria-hidden="true"
            />
            <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto px-3 py-3 sm:px-4 sm:py-8">
              <div
                className="calm-modal neo-panel-strong mobile-form-popup mobile-form-popup-add anim-pop relative w-full max-w-2xl overflow-hidden rounded-[1.2rem]"
                style={{
                  maxHeight:
                    "calc(100dvh - env(safe-area-inset-top) - env(safe-area-inset-bottom) - 1.5rem)",
                }}
              >
                <div className="mobile-form-popup-header flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="neo-kicker">Add product</p>
                    <h3 className="neo-heading text-2xl sm:text-3xl">New inventory item</h3>
                    <p className="mobile-form-popup-copy mt-1.5 text-xs text-[var(--muted)] sm:text-sm">
                      Capture item, tag, and stock in one pass.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="submit"
                      form="add-product-form"
                      className="neo-btn mobile-header-save"
                    >
                      Add
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsAddOpen(false)}
                      className="neo-btn-ghost calm-close h-9 w-9 p-0 text-lg"
                      aria-label="Close"
                    >
                      ×
                    </button>
                  </div>
                </div>

                <div className="mobile-form-popup-body">
                  <ProductForm
                    formId="add-product-form"
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
              className="neo-modal-backdrop z-40"
              onClick={() => setEditingProduct(null)}
              aria-hidden="true"
            />
            <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto px-3 py-3 sm:px-4 sm:py-8">
              <div
                className="calm-modal neo-panel-strong mobile-form-popup mobile-form-popup-edit anim-pop relative w-full max-w-2xl overflow-hidden rounded-[1.2rem]"
                style={{
                  maxHeight:
                    "calc(100dvh - env(safe-area-inset-top) - env(safe-area-inset-bottom) - 1.5rem)",
                }}
              >
                <div className="mobile-form-popup-header flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="neo-kicker">Edit product</p>
                    <h3 className="neo-heading truncate text-2xl sm:text-3xl">{editingProduct.name}</h3>
                    <p className="mobile-form-popup-copy mt-1.5 text-xs text-[var(--muted)] sm:text-sm">
                      {formatAmount(editingProduct.amount.value, editingProduct.amount.unit)} in stock
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="submit"
                      form="edit-product-form"
                      className="neo-btn mobile-header-save"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingProduct(null)}
                      className="neo-btn-ghost calm-close h-9 w-9 p-0 text-lg"
                      aria-label="Close"
                    >
                      ×
                    </button>
                  </div>
                </div>

                <div className="mobile-form-popup-body">
                  <ProductForm
                    formId="edit-product-form"
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
                        onClick={() => setPendingDeleteProduct(editingProduct)}
                        disabled={isDeletingProduct}
                        className="neo-btn-ghost neo-btn-danger whitespace-nowrap"
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

        {pendingDeleteProduct ? (
          <>
            <div
              className="neo-modal-backdrop z-[60]"
              onClick={() => {
                if (!isDeletingProduct) {
                  setPendingDeleteProduct(null);
                }
              }}
              aria-hidden="true"
            />
            <div className="fixed inset-0 z-[70] flex items-center justify-center px-4 py-6">
              <div
                role="dialog"
                aria-modal="true"
                className="neo-panel-strong anim-pop w-full max-w-md rounded-2xl p-5 sm:p-6"
              >
                <p className="neo-kicker">Confirm delete</p>
                <h3 className="neo-heading mt-2 text-2xl leading-tight">
                  Delete “{pendingDeleteProduct.name}”?
                </h3>
                <p className="mt-3 text-sm text-[var(--muted)]">
                  This action cannot be undone.
                </p>
                <div className="mt-5 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setPendingDeleteProduct(null)}
                    disabled={isDeletingProduct}
                    className="neo-btn-ghost"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmDelete}
                    disabled={isDeletingProduct}
                    className="neo-btn neo-btn-danger"
                  >
                    {isDeletingProduct ? "Deleting..." : "Delete"}
                  </button>
                </div>
              </div>
            </div>
          </>
        ) : null}

      </main>
    </div>
  );
}
