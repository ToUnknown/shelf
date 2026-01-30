import { useState } from "react";
import type { ProductInput } from "../lib/productTypes";
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
};

export default function ProductForm({
  onSubmit,
  initialDraft,
  submitLabel = "Save",
  actionsAlign = "left",
  leadingAction,
}: ProductFormProps) {
  const [draft, setDraft] = useState<ProductDraft>(
    initialDraft ?? defaultDraft(),
  );
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const unitPlaceholder =
    draft.amountUnit === "g" ? "grams" : draft.amountUnit === "ml" ? "milliliters" : "pcs";

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
      <div className="grid gap-4 rounded-2xl border border-black/10 bg-white/80 p-5 shadow-[0_20px_45px_rgba(15,23,42,0.08)] backdrop-blur">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex-1">
            <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              Product
            </label>
            <input
              value={draft.name}
              onChange={(event) => updateDraft({ name: event.target.value })}
              placeholder="Fresh tomatoes"
              className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-slate-400 focus:outline-none"
            />
          </div>
          <div className="w-40">
            <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              Tag
            </label>
            <input
              value={draft.tag}
              onChange={(event) => updateDraft({ tag: event.target.value })}
              placeholder="#vegetable"
              className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-slate-400 focus:outline-none"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="w-28">
            <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              Amount
            </label>
            <input
              value={draft.amountValue}
              onChange={(event) =>
                updateDraft({ amountValue: event.target.value })
              }
              placeholder={draft.amountUnit === "pcs" ? "3" : "250"}
              inputMode="decimal"
              className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-slate-400 focus:outline-none"
            />
          </div>
          <div className="w-40">
            <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
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
                className="w-full appearance-none rounded-lg border border-slate-200 bg-white px-3 py-2 pr-9 text-sm text-slate-900 shadow-sm focus:border-slate-400 focus:outline-none"
              >
                <option value="pcs">pcs</option>
                <option value="g">grams</option>
                <option value="ml">milliliters</option>
              </select>
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
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
          <div className="w-28">
            <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              Min
            </label>
            <input
              value={draft.minValue}
              onChange={(event) => updateDraft({ minValue: event.target.value })}
              placeholder={draft.amountUnit === "pcs" ? "1" : "100"}
              inputMode="decimal"
              className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-slate-400 focus:outline-none"
            />
          </div>
          <div className="flex h-[54px] items-end">
            <p className="text-xs text-slate-400">
              Min uses {unitPlaceholder}.
            </p>
          </div>
        </div>

        {error ? (
          <p className="text-sm text-rose-600">{error}</p>
        ) : (
          <p className="text-xs text-slate-500">
            Choose pcs, grams, or milliliters. Min amount is optional.
          </p>
        )}
      </div>

      <div
        className={`flex flex-wrap items-center gap-3 ${
          leadingAction
            ? "justify-between"
            : actionsAlign === "right"
              ? "justify-end"
              : "justify-start"
        }`}
      >
        {leadingAction ? (
          <div className="flex items-center gap-3">{leadingAction}</div>
        ) : null}
        <div className={`flex items-center gap-3 ${leadingAction ? "ml-auto" : ""}`}>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "Saving..." : submitLabel}
          </button>
          <button
            type="button"
            onClick={() => {
              setDraft(initialDraft ?? defaultDraft());
              setError(null);
            }}
            className="text-sm font-semibold text-slate-500 hover:text-slate-700"
          >
            Reset
          </button>
        </div>
      </div>
    </form>
  );
}
