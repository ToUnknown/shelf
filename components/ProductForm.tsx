import { useMemo, useState } from "react";
import type { Product, ProductInput } from "../lib/productTypes";
import {
  defaultDraft,
  parseDraft,
  type ProductDraft,
} from "../lib/productForm";

type ProductFormProps = {
  onSubmit: (input: ProductInput) => Promise<void>;
  formId?: string;
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
  formId,
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
  const [isNameFocused, setIsNameFocused] = useState(false);

  const shortSubmitLabel = submitLabel.split(" ")[0] ?? submitLabel;
  const submitLabelMain = submitLabel.replace(/\s*changes\s*/gi, " ").trim();
  const nameQuery = draft.name.trim().toLowerCase();
  const actionsJustify =
    actionsAlign === "right" ? "justify-end" : "justify-between";
  const submitButtonClass =
    actionsAlign === "right" ? "neo-btn calm-form-submit-action" : "neo-btn calm-form-submit-action ml-auto";
  const formGap =
    actionsAlign === "right" ? "gap-4 sm:gap-5" : "gap-3 sm:gap-4";
  const hasLeadingAction = Boolean(leadingAction);
  const amountHint =
    draft.amountUnit === "pcs"
      ? "Use whole numbers for item counts."
      : "Tip: decimal values are supported.";
  const suggestions = useMemo(() => {
    if (!enableSuggestions || !onSelectExisting || !isNameFocused) return [];
    if (!nameQuery || !existingProducts?.length) return [];
    return existingProducts
      .filter((product) => product.name.toLowerCase().includes(nameQuery))
      .slice(0, 5);
  }, [enableSuggestions, existingProducts, isNameFocused, nameQuery, onSelectExisting]);

  const updateDraft = (patch: Partial<ProductDraft>) => {
    setDraft((current) => ({ ...current, ...patch }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;
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
    <form
      id={formId}
      onSubmit={handleSubmit}
      className={`calm-product-form grid ${formGap}`}
    >
      <div className="calm-form-scroll-region">
        <div className="calm-form-shell rounded-3xl p-3.5 sm:p-5">
          <div className="calm-form-section calm-form-section-main">
            <div className="calm-form-top flex flex-wrap items-center gap-2.5 pb-2 sm:gap-3 sm:pb-3">
              <div className="calm-form-name-field relative w-full sm:flex-1">
                <label className="neo-kicker">Product</label>
                <input
                  value={draft.name}
                  onChange={(event) => updateDraft({ name: event.target.value })}
                  placeholder="Fresh tomatoes"
                  className="neo-input mt-2"
                  onFocus={() => setIsNameFocused(true)}
                  onBlur={() => {
                    window.setTimeout(() => setIsNameFocused(false), 120);
                  }}
                />
                {suggestions.length > 0 ? (
                  <div className="calm-suggestion-list absolute left-0 right-0 top-[calc(100%+6px)] z-30 grid gap-2">
                    {suggestions.map((product) => (
                      <button
                        key={product._id}
                        type="button"
                        onClick={() => onSelectExisting?.(product)}
                        className="neo-panel-strong calm-suggestion flex items-center justify-between gap-3 rounded-2xl px-3 py-2 text-left text-sm text-[var(--muted)] transition hover:-translate-y-0.5 active:scale-[0.99]"
                      >
                        <span>
                          <span className="block font-semibold text-[var(--foreground)]">
                            {product.name}
                          </span>
                          <span className="mt-0.5 block text-[0.65rem] uppercase tracking-[0.14em] text-[var(--muted)]">
                            Open in edit
                          </span>
                        </span>
                        <span className="text-xs text-[var(--muted)]">{product.tag}</span>
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
              <div className="w-full sm:w-40">
                <label className="neo-kicker">Tag</label>
                <input
                  value={draft.tag}
                  onChange={(event) => updateDraft({ tag: event.target.value })}
                  placeholder="#Other"
                  className="neo-input mt-2"
                />
              </div>
            </div>
          </div>

          <div className="calm-form-section calm-form-section-stock mt-3 sm:mt-4">
            <div className="flex items-center justify-between gap-2">
              <p className="neo-kicker">Stock details</p>
              <span className="calm-form-unit-pill">{draft.amountUnit}</span>
            </div>
            <div className="calm-form-fields grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3">
              <div className="min-w-0">
                <label className="neo-kicker">Amount</label>
                <input
                  value={draft.amountValue}
                  onChange={(event) =>
                    updateDraft({ amountValue: event.target.value })
                  }
                  placeholder={draft.amountUnit === "pcs" ? "3" : "250"}
                  inputMode="decimal"
                  className="neo-input mt-2"
                />
              </div>
              <div className="min-w-0">
                <label className="neo-kicker">Unit</label>
                <div className="relative mt-2">
                  <select
                    value={draft.amountUnit}
                    onChange={(event) =>
                      updateDraft({
                        amountUnit: event.target.value,
                        minUnit: event.target.value,
                      })
                    }
                    className="neo-select appearance-none pr-9"
                  >
                    <option value="pcs">pcs</option>
                    <option value="g">g</option>
                    <option value="ml">ml</option>
                  </select>
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted)]">
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
              <div className="col-span-2 min-w-0 sm:col-span-1">
                <label className="neo-kicker">Alert at</label>
                <input
                  value={draft.minValue}
                  onChange={(event) => updateDraft({ minValue: event.target.value })}
                  placeholder={draft.amountUnit === "pcs" ? "1" : "100"}
                  inputMode="decimal"
                  className="neo-input mt-2"
                />
              </div>
            </div>
            <p className="calm-form-helper mt-2 text-xs text-[var(--muted)]">
              {amountHint}
            </p>
          </div>

          <div
            className={`calm-form-actions ${hasLeadingAction ? "has-leading-action" : ""} flex flex-wrap items-center gap-2 ${actionsJustify}`}
          >
            {leadingAction ? leadingAction : null}
            <button
              type="button"
              onClick={() => {
                setDraft(initialDraft ?? defaultDraft());
                setError(null);
              }}
              className="neo-btn-ghost"
            >
              Reset
            </button>
            <button
              type="submit"
              disabled={submitting}
              className={submitButtonClass}
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
          {error ? <p className="calm-form-error text-sm text-[var(--danger)]">{error}</p> : null}
        </div>
      </div>
    </form>
  );
}
