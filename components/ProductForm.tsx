import { useMemo, useState } from "react";
import type { Product, ProductInput } from "../lib/productTypes";
import {
  defaultDraft,
  parseDraft,
  type ProductDraft,
} from "../lib/productForm";

type ProductFormProps = {
  onSubmit: (input: ProductInput) => Promise<void>;
  initialDraft?: ProductDraft;
  submitLabel?: string;
  actionsAlign?: "left" | "right";
  leadingAction?: React.ReactNode;
  existingProducts?: Product[];
  onSelectExisting?: (product: Product) => void;
  enableSuggestions?: boolean;
};

export default function ProductForm({
  onSubmit,
  initialDraft,
  submitLabel = "Save",
  actionsAlign = "left",
  leadingAction,
  existingProducts,
  onSelectExisting,
  enableSuggestions = false,
}: ProductFormProps) {
  const [draft, setDraft] = useState<ProductDraft>(
    initialDraft ?? defaultDraft(),
  );
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const unitPlaceholder =
    draft.amountUnit === "g"
      ? "grams"
      : draft.amountUnit === "ml"
        ? "milliliters"
        : "pcs";
  const shortSubmitLabel = submitLabel.split(" ")[0] ?? submitLabel;
  const submitLabelMain = submitLabel.replace(/\s*changes\s*/gi, " ").trim();
  const nameQuery = draft.name.trim().toLowerCase();
  const suggestions = useMemo(() => {
    if (!enableSuggestions || !onSelectExisting) return [];
    if (!nameQuery || !existingProducts?.length) return [];
    return existingProducts
      .filter((product) => product.name.toLowerCase().includes(nameQuery))
      .slice(0, 5);
  }, [enableSuggestions, existingProducts, nameQuery, onSelectExisting]);

  const updateDraft = (patch: Partial<ProductDraft>) => {
    setDraft((current) => ({ ...current, ...patch }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const result = parseDraft(draft);
    if (!result.input) {
      setError(result.error ?? "Check the product fields.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await onSubmit(result.input);
      setDraft(initialDraft ?? defaultDraft());
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong. Try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="grid gap-4">
      <div className="grid gap-4 rounded-2xl border border-black/10 bg-white/80 p-4 shadow-[0_20px_45px_rgba(15,23,42,0.08)] dark:border-white/10 dark:bg-slate-900/80 sm:p-5">
        <div className="flex flex-wrap items-center gap-3">
          <div className="w-full sm:flex-1">
            <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
              Product
            </label>
            <input
              value={draft.name}
              onChange={(event) => updateDraft({ name: event.target.value })}
              placeholder="Fresh tomatoes"
              className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-base text-slate-900 shadow-sm transition duration-200 focus:border-slate-400 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-slate-500 sm:text-sm"
            />
            {suggestions.length > 0 ? (
              <div className="mt-2 grid gap-2">
                {suggestions.map((product) => (
                  <button
                    key={product._id}
                    type="button"
                    onClick={() => onSelectExisting?.(product)}
                    className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2 text-left text-sm text-slate-600 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 active:scale-[0.99] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-slate-600"
                  >
                    <span className="font-semibold text-slate-900 dark:text-slate-100">
                      {product.name}
                    </span>
                    <span className="text-xs text-slate-400 dark:text-slate-500">
                      {product.tag}
                    </span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
          <div className="w-full sm:w-40">
            <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
              Tag
            </label>
            <input
              value={draft.tag}
              onChange={(event) => updateDraft({ tag: event.target.value })}
              placeholder="#other"
              className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-base text-slate-900 shadow-sm transition duration-200 focus:border-slate-400 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-slate-500 sm:text-sm"
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="min-w-0">
            <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
              Amount
            </label>
            <input
              value={draft.amountValue}
              onChange={(event) =>
                updateDraft({ amountValue: event.target.value })
              }
              placeholder={draft.amountUnit === "pcs" ? "3" : "250"}
              inputMode="decimal"
              className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-base text-slate-900 shadow-sm transition duration-200 focus:border-slate-400 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-slate-500 sm:text-sm"
            />
          </div>
          <div className="min-w-0">
            <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
              Unit
            </label>
            <div className="relative mt-2">
              <select
                value={draft.amountUnit}
                onChange={(event) =>
                  updateDraft({
                    amountUnit: event.target.value,
                    minUnit: event.target.value,
                  })
                }
                className="w-full appearance-none rounded-lg border border-slate-200 bg-white px-3 py-2 pr-9 text-base text-slate-900 shadow-sm transition duration-200 focus:border-slate-400 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-slate-500 sm:text-sm"
              >
                <option value="pcs">pcs</option>
                <option value="g">grams</option>
                <option value="ml">milliliters</option>
              </select>
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500">
                <svg
                  viewBox="0 0 20 20"
                  fill="none"
                  className="h-4 w-4"
                  stroke="currentColor"
                  strokeWidth="1.8"
                >
                  <path d="M6 8l4 4 4-4" strokeLinecap="round" />
                </svg>
              </span>
            </div>
          </div>
          <div className="min-w-0">
            <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
              Min
            </label>
            <input
              value={draft.minValue}
              onChange={(event) => updateDraft({ minValue: event.target.value })}
              placeholder={draft.amountUnit === "pcs" ? "1" : "100"}
              inputMode="decimal"
              className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-base text-slate-900 shadow-sm transition duration-200 focus:border-slate-400 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-slate-500 sm:text-sm"
            />
          </div>
        </div>

        {error ? <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p> : null}
      </div>

      <div className="grid grid-cols-3 items-center gap-2 sm:gap-3">
        <div className="justify-self-start">
          {leadingAction ? (
            leadingAction
          ) : (
            <button
              type="button"
              onClick={() => {
                setDraft(initialDraft ?? defaultDraft());
                setError(null);
              }}
              className="whitespace-nowrap text-sm font-semibold text-slate-500 transition hover:-translate-y-0.5 hover:text-slate-700 active:scale-95 dark:text-slate-400 dark:hover:text-slate-200"
            >
              Reset
            </button>
          )}
        </div>
        <div className="justify-self-center">
          {leadingAction ? (
            <button
              type="button"
              onClick={() => {
                setDraft(initialDraft ?? defaultDraft());
                setError(null);
              }}
              className="whitespace-nowrap text-sm font-semibold text-slate-500 transition hover:-translate-y-0.5 hover:text-slate-700 active:scale-95 dark:text-slate-400 dark:hover:text-slate-200"
            >
              Reset
            </button>
          ) : null}
        </div>
        <div className="justify-self-end">
          <button
            type="submit"
            disabled={submitting}
            className="whitespace-nowrap rounded-full bg-slate-900 px-3 py-2 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-slate-800 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white sm:px-5 sm:py-2 sm:text-sm"
          >
            {submitting ? (
              <>
                <span className="sm:hidden">Saving</span>
                <span className="hidden sm:inline">Saving...</span>
              </>
            ) : (
              <>
                <span className="sm:hidden">{shortSubmitLabel}</span>
              <span className="hidden sm:inline">{submitLabelMain}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </form>
  );
}
