import { isAuthSessionMissingError, type SupabaseClient } from "@supabase/supabase-js";

const MAX_BODY_BYTES = 4096;
const LOOKUP_COLUMNS = "id,user_id,status,expires_at";
const RESULT_COLUMNS = "id,status,score,duration_ms,submitted_at";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Dependencies = {
  createSessionClient: () => SupabaseClient | Promise<SupabaseClient>;
  createWriterClient: () => SupabaseClient;
};

type Session = {
  id: string;
  user_id: string;
  status: string;
  expires_at: string;
};

type SubmittedSession = {
  id: string;
  status: "submitted";
  score: number;
  duration_ms: number;
  submitted_at: string;
};

function failure(status: number, error: string, message: string) {
  return Response.json({ error, message }, {
    status,
    headers: { "Cache-Control": "no-store", ...(status === 405 ? { Allow: "POST" } : {}) },
  });
}

function unavailable() {
  return failure(503, "SUBMIT_UNAVAILABLE", "No pudimos enviar el resultado. Inténtalo más tarde.");
}

function notSubmittable() {
  return failure(409, "SESSION_NOT_SUBMITTABLE", "La partida ya no admite este envío.");
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

function isNonnegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

// Dependencies come only from the server route, never from request input.
export async function handleSubmitGameSession(request: Request, dependencies: Dependencies): Promise<Response> {
  if (request.method !== "POST") return failure(405, "INVALID_REQUEST", "Usa POST para enviar un resultado.");
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
      return failure(401, "UNAUTHENTICATED", "Inicia sesión para enviar el resultado.");
    }
    if (!user) return failure(401, "UNAUTHENTICATED", "Inicia sesión para enviar el resultado.");

    let input: unknown;
    try {
      input = JSON.parse(await readBody(request));
    } catch (error) {
      return failure(error instanceof BodyTooLargeError ? 413 : 400, "INVALID_REQUEST", "La solicitud de envío no es válida.");
    }
    if (!input || typeof input !== "object" || Array.isArray(input)
      || Object.keys(input).some((key) => !["session_id", "score", "duration_ms", "metrics"].includes(key))) {
      return failure(400, "INVALID_REQUEST", "Envía únicamente session_id, score, duration_ms y, opcionalmente, metrics.");
    }
    const { session_id, score, duration_ms, metrics } = input as {
      session_id?: unknown;
      score?: unknown;
      duration_ms?: unknown;
      metrics?: unknown;
    };
    if (typeof session_id !== "string" || !UUID.test(session_id)
      || !isNonnegativeInteger(score) || !isNonnegativeInteger(duration_ms)
      || (metrics !== undefined && (!metrics || typeof metrics !== "object" || Array.isArray(metrics)))) {
      return failure(400, "INVALID_REQUEST", "Indica una sesión válida, score y duration_ms enteros no negativos, y metrics como objeto JSON.");
    }
    const sessionId = session_id.toLowerCase();

    // Read with the player's client and RLS; never use the privileged writer to discover ownership.
    const { data: session, error: lookupError } = await supabase
      .schema("public")
      .from("game_sessions")
      .select(LOOKUP_COLUMNS)
      .eq("id", sessionId)
      .eq("user_id", user.id)
      .maybeSingle<Session>();
    if (lookupError) return unavailable();
    if (!session || session.id !== sessionId || session.user_id !== user.id) {
      return failure(404, "SESSION_NOT_FOUND", "No encontramos esa partida.");
    }
    if (session.status !== "started") {
      return failure(409, "SESSION_NOT_STARTED", "La partida ya no está en estado started.");
    }
    const expiresAt = Date.parse(session.expires_at);
    if (!Number.isFinite(expiresAt)) return unavailable();
    if (expiresAt <= Date.now()) return failure(409, "SESSION_EXPIRED", "La partida ya venció.");

    const writer = dependencies.createWriterClient();
    // The conditional UPDATE is atomic: stale reads and concurrent submissions cannot overwrite a result.
    // Core sets submitted_at and updated_at; they must not appear in the PATCH or its column grants.
    const { data: submitted, error: submitError } = await writer
      .schema("public")
      .from("game_sessions")
      .update({ status: "submitted", score, duration_ms, metrics: metrics ?? {} })
      .eq("id", sessionId)
      .eq("user_id", user.id)
      .eq("status", "started")
      .gt("expires_at", new Date().toISOString())
      .select(RESULT_COLUMNS)
      .maybeSingle<SubmittedSession>()
      .retry(false);
    if (submitError) return submitError.code === "23514" ? notSubmittable() : unavailable();
    if (!submitted) return notSubmittable();
    if (submitted.id !== sessionId || submitted.status !== "submitted"
      || submitted.score !== score || submitted.duration_ms !== duration_ms
      || typeof submitted.submitted_at !== "string" || !Number.isFinite(Date.parse(submitted.submitted_at))) {
      return unavailable();
    }

    // Submission records unverified client results. It does not validate or grant rewards.
    return Response.json({
      id: submitted.id,
      status: submitted.status,
      score: submitted.score,
      duration_ms: submitted.duration_ms,
      submitted_at: submitted.submitted_at,
    }, { status: 200, headers: { "Cache-Control": "no-store" } });
  } catch {
    return unavailable();
  }
}
