import type { Id } from "convex/_generated/dataModel";

export type ProductAmount = {
  value: number;
  unit: string;
};

export type Product = {
  _id: Id<"products">;
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
