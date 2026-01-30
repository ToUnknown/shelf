import type { Product, ProductAmount, ProductInput } from "./productTypes";

export type ProductDraft = {
  name: string;
  tag: string;
  amountValue: string;
  amountUnit: string;
  minValue: string;
  minUnit: string;
};

const allowedUnits = ["pcs", "g", "ml"] as const;
type AllowedUnit = (typeof allowedUnits)[number];

export const defaultDraft = (): ProductDraft => ({
  name: "",
  tag: "#uncategorized",
  amountValue: "",
  amountUnit: "pcs",
  minValue: "",
  minUnit: "pcs",
});

const normalizeForEdit = (
  value: number,
  unit: string,
): { value: number; unit: AllowedUnit } => {
  const normalizedUnit = unit.trim().toLowerCase();
  if (normalizedUnit === "kg") {
    return { value: value * 1000, unit: "g" };
  }
  if (normalizedUnit === "l") {
    return { value: value * 1000, unit: "ml" };
  }
  if (normalizedUnit === "grams") {
    return { value, unit: "g" };
  }
  if (normalizedUnit === "milliliters") {
    return { value, unit: "ml" };
  }
  if (allowedUnits.includes(normalizedUnit as AllowedUnit)) {
    return { value, unit: normalizedUnit as AllowedUnit };
  }
  return { value, unit: "pcs" };
};

export const draftFromProduct = (product: Product): ProductDraft => {
  const amount = normalizeForEdit(product.amount.value, product.amount.unit);
  const minAmount = product.minAmount
    ? normalizeForEdit(product.minAmount.value, product.minAmount.unit)
    : null;

  return {
    name: product.name,
    tag: product.tag,
    amountValue: String(amount.value),
    amountUnit: amount.unit,
    minValue: minAmount ? String(minAmount.value) : "",
    minUnit: minAmount?.unit ?? amount.unit,
  };
};

const normalizeTag = (rawTag: string) => {
  const trimmed = rawTag.trim();
  if (!trimmed) return "#uncategorized";
  return trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
};

const parseAmount = (value: string, unit: string): ProductAmount | null => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  const normalizedUnit = unit.trim().toLowerCase();
  if (!allowedUnits.includes(normalizedUnit as AllowedUnit)) return null;
  return { value: parsed, unit: normalizedUnit };
};

export const parseDraft = (
  draft: ProductDraft,
): { input?: ProductInput; error?: string } => {
  const name = draft.name.trim();
  if (!name) {
    return { error: "Product name is required." };
  }

  const amount = parseAmount(draft.amountValue, draft.amountUnit);
  if (!amount) {
    return { error: "Amount must be a positive number with a unit." };
  }

  let minAmount: ProductAmount | undefined;
  if (draft.minValue.trim()) {
    const parsedMin = parseAmount(
      draft.minValue,
      amount.unit,
    );
    if (!parsedMin) {
      return { error: "Min amount must be a positive number with a unit." };
    }
    minAmount = parsedMin;
  }

  return {
    input: {
      name,
      tag: normalizeTag(draft.tag),
      amount,
      minAmount,
    },
  };
};
