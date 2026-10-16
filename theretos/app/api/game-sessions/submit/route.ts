import { handleSubmitGameSession } from "@/lib/games/submit-session";
import { createClient } from "@/lib/supabase/server";
import { createGameSessionWriter } from "@/lib/supabase/game-session-writer";

export const runtime = "nodejs";

export async function POST(request: Request) {
  return handleSubmitGameSession(request, {
    createSessionClient: createClient,
    createWriterClient: createGameSessionWriter,
  });
}
