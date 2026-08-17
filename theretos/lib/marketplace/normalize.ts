import type {
  MarketplaceAward,
  MarketplaceAwardApi,
  MarketplaceCategory,
  MarketplaceCategoryApi,
} from "./types";

const text = (value: unknown) => typeof value === "string" ? value.trim() : "";

const number = (value: unknown) => {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const status = (value: unknown, fallback = true) => {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "1", "activo", "active"].includes(normalized)) return true;
    if (["false", "0", "inactivo", "inactive"].includes(normalized)) return false;
  }
  return fallback;
};

const embeddedCategoryName = (category: unknown) => {
  if (!category || typeof category !== "object") return "";
  return text((category as { name?: unknown }).name);
};

export function normalizeCategories(input: unknown): MarketplaceCategory[] {
  if (!Array.isArray(input)) return [];
  return input.map((raw, index) => {
    const item = raw as MarketplaceCategoryApi;
    return {
      id: text(item.uid) || text(item.id) || `category-${index}`,
      name: text(item.name) || "Otros",
      active: status(item.status),
    };
  }).filter((item) => item.active);
}

export function normalizeAwards(
  input: unknown,
  categories: MarketplaceCategory[],
): MarketplaceAward[] {
  if (!Array.isArray(input)) return [];
  const categoryNames = new Map(categories.map((item) => [item.id, item.name]));

  return input.map((raw, index) => {
    const item = raw as MarketplaceAwardApi;
    const categoryId = text(item.category_uid);
    const etickets = number(item.eTicket);
    const stock = number(item.in_stock);
    return {
      id: text(item.uid) || text(item.id) || `award-${index}`,
      name: text(item.name) || "Premio THERETOS",
      etickets,
      stock,
      categoryId,
      categoryName: categoryNames.get(categoryId) || embeddedCategoryName(item.category) || "Otros",
      imageUrl: text(item.path_image) || null,
      active: status(item.status),
      redeemable: etickets > 0 && stock > 0,
    };
  }).filter((item) => item.active);
}
