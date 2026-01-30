"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import ProductForm from "../components/ProductForm";
import ProductListItem from "../components/ProductListItem";
import type { Product, ProductInput } from "../lib/productTypes";
import { draftFromProduct } from "../lib/productForm";

export default function Home() {
  const products = useQuery(api.products.list);
  const createProduct = useMutation(api.products.create);
  const updateProduct = useMutation(api.products.update);
  const removeProduct = useMutation(api.products.remove);
  const [search, setSearch] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const isModalOpen = isAddOpen || Boolean(editingProduct);
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

  return (
    <div className="h-[100lvh] min-h-[100lvh] overflow-hidden bg-[var(--background)] px-6 pt-8 pb-0 text-slate-900 sm:pt-12">
      <main className="mx-auto flex h-full min-h-0 w-full max-w-5xl flex-col gap-6">
        <div
          className={`flex min-h-0 flex-1 flex-col gap-6 transition-opacity duration-200 ${
            isModalOpen ? "opacity-20" : "opacity-100"
          }`}
        >
          <header className="flex flex-wrap items-end justify-between gap-6">
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.4em] text-slate-500">
                MVP
              </p>
              <h1 className="text-3xl font-semibold tracking-tight text-slate-900 md:text-4xl">
                Shelf
              </h1>
            </div>
            <div className="rounded-full border border-slate-200 bg-white/70 px-4 py-2 text-xs font-semibold text-slate-500 shadow-sm">
              {products?.length ?? 0} products
            </div>
          </header>

          <section className="flex min-h-0 flex-1 flex-col">
          <div className="relative flex min-h-10 flex-nowrap items-center justify-between gap-4 sm:flex-wrap">
            <h2 className="text-lg font-semibold text-slate-900">List of products</h2>
            <div className="flex flex-wrap items-center gap-3">
              <label className="group relative hidden items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600 shadow-sm focus-within:border-slate-400 focus-within:ring-2 focus-within:ring-slate-200 sm:flex">
                <span className="text-slate-400" aria-hidden="true">
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
                  className="w-52 bg-transparent pr-7 text-sm text-slate-800 outline-none placeholder:text-slate-400"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    className="absolute right-3 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-slate-400 transition hover:text-slate-600"
                    aria-label="Clear search"
                  >
                    <svg
                      viewBox="0 0 20 20"
                      fill="none"
                      className="h-4 w-4"
                      stroke="currentColor"
                      strokeWidth="1.8"
                    >
                      <path
                        d="M5 5l10 10M15 5l-10 10"
                        strokeLinecap="round"
                      />
                    </svg>
                  </button>
                )}
              </label>
              {!isSearchOpen && (
                <button
                  type="button"
                  onClick={() => setIsSearchOpen(true)}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:border-slate-300 sm:hidden"
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
                className={`relative z-20 h-10 w-10 items-center justify-center rounded-full bg-slate-900 text-2xl font-semibold leading-none text-white shadow-sm transition hover:bg-slate-800 ${
                  isSearchOpen ? "hidden sm:flex" : "flex"
                }`}
                aria-label="Add product"
              >
                +
              </button>
            </div>
            {isSearchOpen && (
              <div className="absolute inset-y-0 left-0 right-0 z-30 flex items-center gap-3 bg-transparent sm:hidden">
                <label className="flex flex-1 items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600 shadow-sm focus-within:border-slate-400 focus-within:ring-2 focus-within:ring-slate-200">
                  <span className="text-slate-400" aria-hidden="true">
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
                    className="flex-1 bg-transparent text-base text-slate-800 outline-none placeholder:text-slate-400 sm:text-sm"
                    autoFocus
                  />
                </label>
                <button
                  type="button"
                  onClick={() => setIsSearchOpen(false)}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:border-slate-300"
                  aria-label="Close search"
                >
                  <svg
                    viewBox="0 0 20 20"
                    fill="none"
                    className="h-4 w-4"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  >
                    <path
                      d="M5 5l10 10M15 5l-10 10"
                      strokeLinecap="round"
                    />
                  </svg>
                </button>
              </div>
            )}
          </div>

          <div className="relative mt-4 flex-1 min-h-0 overflow-hidden">
            <div
              className="h-full min-h-0 overflow-y-auto overscroll-contain no-scrollbar scroll-clip list-fade-edges"
            >
              <div className="grid gap-4 pb-0 pt-2">
                {filteredProducts.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-white/70 p-10 text-center text-sm text-slate-500">
                    No products yet. Add your first item above.
                  </div>
                ) : (
                  filteredProducts.map((product: Product) => (
                    <ProductListItem
                      key={product._id}
                      product={product}
                      onSelect={setEditingProduct}
                    />
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
            <div className="relative w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl sm:rounded-3xl sm:p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.4em] text-slate-400">
                    Add product
                  </p>
                  <h3 className="text-xl font-semibold text-slate-900">
                    New inventory item
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-lg font-semibold text-slate-500 hover:border-slate-300 hover:text-slate-700"
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
            <div className="relative w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl sm:rounded-3xl sm:p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.4em] text-slate-400">
                    Edit product
                  </p>
                  <h3 className="text-xl font-semibold text-slate-900">
                    {editingProduct.name}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-lg font-semibold text-slate-500 hover:border-slate-300 hover:text-slate-700"
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
                      className="whitespace-nowrap rounded-full border border-rose-200 px-3 py-2 text-sm font-semibold text-rose-600 transition hover:bg-rose-50 sm:px-4 sm:py-2 sm:text-sm"
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
      </main>
    </div>
  );
}
