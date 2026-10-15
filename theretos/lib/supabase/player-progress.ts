import { isAuthSessionMissingError, type SupabaseClient } from "@supabase/supabase-js";

export type PlayerProgress = {
  level: number;
  xp_total: number;
  tickets_balance: number;
  games_played: number;
};

export type PlayerProgressResult =
  | { status: "ready"; userId: string; progress: PlayerProgress }
  | { status: "unauthenticated" | "missing" | "error" };

function isPlayerProgress(value: unknown): value is PlayerProgress {
  if (!value || typeof value !== "object") return false;
  const progress = value as Partial<PlayerProgress>;
  return (["level", "xp_total", "tickets_balance", "games_played"] as const).every((field) => {
    const amount = progress[field];
    return typeof amount === "number" && Number.isSafeInteger(amount) && amount >= (field === "level" ? 1 : 0);
  });
}

export async function readOwnPlayerProgress(supabase: SupabaseClient): Promise<PlayerProgressResult> {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) {
      return { status: isAuthSessionMissingError(authError) || authError.status === 401 || authError.status === 403 ? "unauthenticated" : "error" };
    }
    if (!user) return { status: "unauthenticated" };

    // The verified session supplies the UID; RLS remains the read authority.
    const { data, error, status } = await supabase
      .schema("public")
      .from("player_progress")
      .select("level,xp_total,tickets_balance,games_played")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) return { status: status === 401 ? "unauthenticated" : "error" };
    if (!data) return { status: "missing" };
    // Do not display malformed data or bigint values rounded by JavaScript.
    if (!isPlayerProgress(data)) return { status: "error" };
    return { status: "ready", userId: user.id, progress: data };
  } catch {
    return { status: "error" };
  }
}
