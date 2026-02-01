import type { GenericId } from "convex/values";

export type ProductAmount = {
  value: number;
  unit: string;
};

export type Product = {
  _id: GenericId<"products">;
  householdId?: GenericId<"households">;
  name: string;
  tag: string;
  amount: ProductAmount;
  minAmount?: ProductAmount;
  createdAt: number;
  updatedAt: number;
  updatedBy?: GenericId<"users">;
};

export type ProductInput = {
  name: string;
  tag: string;
  amount: ProductAmount;
  minAmount?: ProductAmount;
};
