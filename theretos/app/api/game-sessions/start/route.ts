import { handleStartGameSession } from "@/lib/games/start-session";
import { createClient } from "@/lib/supabase/server";
import { createGameSessionWriter } from "@/lib/supabase/game-session-writer";

export const runtime = "nodejs";

export async function POST(request: Request) {
  return handleStartGameSession(request, {
    createSessionClient: createClient,
    createWriterClient: createGameSessionWriter,
  });
}
