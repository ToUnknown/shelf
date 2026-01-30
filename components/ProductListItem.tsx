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
  return (
    <button
      type="button"
      onClick={() => onSelect(product)}
      className="flex w-full items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
    >
      <div className="space-y-1">
        <p className="text-sm font-semibold text-slate-900">{product.name}</p>
        <p className="text-xs text-slate-500">{product.tag}</p>
      </div>
      <div className="text-right">
        <p className="text-sm font-semibold text-slate-900">
          {formatAmount(product.amount.value, product.amount.unit)}
        </p>
        {product.minAmount ? (
          <p className="text-xs text-slate-500">
            Min {formatAmount(product.minAmount.value, product.minAmount.unit)}
          </p>
        ) : (
          <p className="text-xs text-slate-400">No min</p>
        )}
      </div>
    </button>
  );
}
