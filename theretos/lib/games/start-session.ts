import { isAuthSessionMissingError, type SupabaseClient } from "@supabase/supabase-js";

// Allows time to load and play; this phase does not submit or expire sessions.
export const GAME_SESSION_TTL_MS = 15 * 60 * 1000;
const MAX_BODY_BYTES = 4096;
const SESSION_COLUMNS = "id,game_id,status,started_at,expires_at";

type Dependencies = {
  createSessionClient: () => SupabaseClient | Promise<SupabaseClient>;
  createWriterClient: () => SupabaseClient;
};

type StartedSession = {
  id: string;
  game_id: string;
  status: "started";
  started_at: string;
  expires_at: string;
};

function failure(status: number, error: string, message: string) {
  return Response.json({ error, message }, {
    status,
    headers: { "Cache-Control": "no-store", ...(status === 405 ? { Allow: "POST" } : {}) },
  });
}

function unavailable() {
  return failure(503, "START_UNAVAILABLE", "No pudimos iniciar la partida. Inténtalo más tarde.");
}

class BodyTooLargeError extends Error {}

async function readBody(request: Request) {
  if (!request.body) return "";
  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let bytes = 0;
  let text = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > MAX_BODY_BYTES) {
        await reader.cancel();
        throw new BodyTooLargeError();
      }
      text += decoder.decode(value, { stream: true });
    }
    return text + decoder.decode();
  } finally {
    reader.releaseLock();
  }
}

// Dependencies are supplied only by the server route, never by request input.
export async function handleStartGameSession(request: Request, dependencies: Dependencies): Promise<Response> {
  if (request.method !== "POST") return failure(405, "INVALID_REQUEST", "Usa POST para iniciar una partida.");
  const origin = request.headers.get("origin");
  if (request.headers.get("sec-fetch-site") === "cross-site" || (origin && origin !== new URL(request.url).origin)) {
    return failure(403, "INVALID_REQUEST", "La solicitud no está permitida.");
  }
  if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") {
    return failure(415, "INVALID_REQUEST", "Envía la solicitud como JSON.");
  }

  try {
    const supabase = await dependencies.createSessionClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) {
      if (!isAuthSessionMissingError(authError) && authError.status !== 401 && authError.status !== 403) return unavailable();
      return failure(401, "UNAUTHENTICATED", "Inicia sesión para jugar.");
    }
    if (!user) return failure(401, "UNAUTHENTICATED", "Inicia sesión para jugar.");

    let input: unknown;
    try {
      input = JSON.parse(await readBody(request));
    } catch (error) {
      return failure(error instanceof BodyTooLargeError ? 413 : 400, "INVALID_REQUEST", "La solicitud de inicio no es válida.");
    }
    if (!input || typeof input !== "object" || Array.isArray(input)
      || Object.keys(input).some((key) => key !== "game_slug" && key !== "mode")) {
      return failure(400, "INVALID_REQUEST", "Envía únicamente game_slug y mode.");
    }
    const { game_slug, mode } = input as { game_slug?: unknown; mode?: unknown };
    if (typeof game_slug !== "string" || game_slug.length > 100 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(game_slug)) {
      return failure(400, "INVALID_REQUEST", "Indica un juego válido.");
    }
    if (mode !== "practice" && mode !== "competitive") {
      return failure(400, "INVALID_MODE", "El modo debe ser practice o competitive.");
    }

    const { data: game, error: gameError } = await supabase
      .schema("public")
      .from("games")
      .select("id,slug,status")
      .eq("slug", game_slug)
      .maybeSingle<{ id: string; slug: string; status: string }>();
    if (gameError) return unavailable();
    if (!game) return failure(404, "GAME_NOT_FOUND", "No encontramos ese juego.");
    if (game.status !== "available") return failure(409, "GAME_UNAVAILABLE", "Este juego aún no está disponible.");

    // Never attach the player's cookies or bearer token to this writer.
    const writer = dependencies.createWriterClient();
    const started = Date.now();
    const { data: session, error: sessionError } = await writer
      .schema("public")
      .from("game_sessions")
      .insert({
        user_id: user.id,
        game_id: game.id,
        mode,
        status: "started",
        started_at: new Date(started).toISOString(),
        expires_at: new Date(started + GAME_SESSION_TTL_MS).toISOString(),
      })
      .select(SESSION_COLUMNS)
      .single<StartedSession>()
      .retry(false);
    if (sessionError || !session || session.status !== "started" || session.game_id !== game.id) return unavailable();

    // Explicit projection: no identity, score, metrics or internal diagnostics.
    return Response.json({
      id: session.id,
      game_id: session.game_id,
      game_slug: game.slug,
      status: session.status,
      started_at: session.started_at,
      expires_at: session.expires_at,
    }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch {
    return unavailable();
  }
}
