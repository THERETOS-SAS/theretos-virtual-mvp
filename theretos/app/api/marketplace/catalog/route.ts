import { getMarketplaceCatalog } from "../../../../lib/marketplace/api";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return Response.json(await getMarketplaceCatalog(), {
      headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120" },
    });
  } catch (error) {
    console.error("Marketplace catalog fetch failed", error);
    return Response.json(
      { error: "MARKETPLACE_UNAVAILABLE", message: "No pudimos cargar los premios." },
      { status: 503 },
    );
  }
}
