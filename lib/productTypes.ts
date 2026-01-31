import type { GenericId } from "convex/values";

export type ProductAmount = {
  value: number;
  unit: string;
};

export type Product = {
  _id: GenericId<"products">;
  name: string;
  tag: string;
  amount: ProductAmount;
  minAmount?: ProductAmount;
  createdAt: number;
  updatedAt: number;
};

export type ProductInput = {
  name: string;
  tag: string;
  amount: ProductAmount;
  minAmount?: ProductAmount;
};
