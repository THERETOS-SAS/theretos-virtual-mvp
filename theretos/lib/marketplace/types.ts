export type MarketplaceAwardApi = {
  id?: unknown;
  uid?: unknown;
  name?: unknown;
  eTicket?: unknown;
  in_stock?: unknown;
  category_uid?: unknown;
  category?: unknown;
  path_image?: unknown;
  status?: unknown;
};

export type MarketplaceCategoryApi = {
  id?: unknown;
  uid?: unknown;
  name?: unknown;
  status?: unknown;
};

export type MarketplaceCategory = {
  id: string;
  name: string;
  active: boolean;
};

export type MarketplaceAward = {
  id: string;
  name: string;
  etickets: number;
  stock: number;
  categoryId: string;
  categoryName: string;
  imageUrl: string | null;
  active: boolean;
  redeemable: boolean;
};

export type MarketplaceCatalogResponse = {
  awards: MarketplaceAward[];
  categories: MarketplaceCategory[];
};
