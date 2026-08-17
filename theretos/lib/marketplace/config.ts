export const AWARDS_API =
  process.env.THERETOS_AWARDS_API_URL ??
  "https://us-central1-theretos-c7974.cloudfunctions.net/api-award";

export const CATEGORIES_API =
  process.env.THERETOS_CATEGORIES_API_URL ??
  "https://us-central1-theretos-c7974.cloudfunctions.net/api-awardcategory/awardcategories";

export const MARKETPLACE_FETCH_TIMEOUT_MS = 9_000;
export const MARKETPLACE_RETRY_DELAY_MS = 500;
