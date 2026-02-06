import type { Product } from "../lib/productTypes";

type ProductListItemProps = {
  product: Product;
  onSelect: (product: Product) => void;
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

export default function ProductListItem({
  product,
  onSelect,
}: ProductListItemProps) {
  const displayTag =
    product.tag.trim().toLowerCase() === "#uncategorized"
      ? "#other"
      : product.tag;
  const isLowStock =
    Boolean(product.minAmount) &&
    product.minAmount?.unit === product.amount.unit &&
    product.amount.value <= product.minAmount.value;

  return (
    <button
      type="button"
      onClick={() => onSelect(product)}
      className="neo-panel flex min-h-[4.25rem] w-full items-start justify-between gap-3 rounded-2xl px-3.5 py-3.5 text-left transition hover:-translate-y-0.5 active:scale-[0.99] sm:items-center sm:gap-4 sm:px-4 sm:py-3"
      style={{ boxShadow: "none" }}
    >
      <div className="min-w-0 space-y-1">
        <p className="truncate text-sm font-semibold text-[var(--foreground)]">{product.name}</p>
        <p className="text-xs text-[var(--muted)]">{displayTag}</p>
      </div>
      <div className="text-right tabular-nums">
        <p className="text-sm font-semibold text-[var(--foreground)]">
          {formatAmount(product.amount.value, product.amount.unit)}
        </p>
        {product.minAmount ? (
          <p
            className={`text-xs ${
              isLowStock ? "text-[var(--danger)]" : "text-[var(--muted)]"
            }`}
          >
            Min {formatAmount(product.minAmount.value, product.minAmount.unit)}
          </p>
        ) : (
          <p className="text-xs text-[var(--muted)]">No min</p>
        )}
      </div>
    </button>
  );
}
