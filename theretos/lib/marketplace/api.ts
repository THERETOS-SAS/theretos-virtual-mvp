import {
  AWARDS_API,
  CATEGORIES_API,
  MARKETPLACE_FETCH_TIMEOUT_MS,
  MARKETPLACE_RETRY_DELAY_MS,
} from "./config";
import { normalizeAwards, normalizeCategories } from "./normalize";
import type { MarketplaceCatalogResponse } from "./types";

const retryableStatuses = new Set([429, 500, 502, 503, 504]);

class MarketplaceUpstreamError extends Error {
  constructor(public status: number) {
    super(`Marketplace upstream responded ${status}`);
  }
}

const wait = (milliseconds: number) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

const fetchOnce = async (url: string) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), MARKETPLACE_FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      next: { revalidate: 60 },
      headers: { Accept: "application/json" },
    });
    if (!response.ok) throw new MarketplaceUpstreamError(response.status);
    try {
      return await response.json() as unknown;
    } catch {
      throw new MarketplaceUpstreamError(200);
    }
  } finally {
    clearTimeout(timeout);
  }
};

const fetchJson = async (url: string) => {
  try {
    return await fetchOnce(url);
  } catch (error) {
    const shouldRetry = !(error instanceof MarketplaceUpstreamError)
      || retryableStatuses.has(error.status);
    if (!shouldRetry) throw error;
    await wait(MARKETPLACE_RETRY_DELAY_MS);
    return fetchOnce(url);
  }
};

export async function getMarketplaceCatalog(): Promise<MarketplaceCatalogResponse> {
  const [awardsInput, categoriesInput] = await Promise.all([
    fetchJson(AWARDS_API),
    fetchJson(CATEGORIES_API),
  ]);
  const categories = normalizeCategories(categoriesInput);
  return { awards: normalizeAwards(awardsInput, categories), categories };
}
