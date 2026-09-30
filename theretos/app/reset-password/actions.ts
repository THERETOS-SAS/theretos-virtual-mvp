"use server";

import { createClient } from "@/lib/supabase/server";
import { PasswordRecoveryError, updatePassword } from "@/lib/supabase/password";

type Result = { ok: true } | { ok: false; message: string; sessionExpired: boolean };

export async function saveNewPassword(
  expectedUserId: string,
  password: string,
  confirmation: string,
): Promise<Result> {
  try {
    // Each request has its own cookie snapshot. Another browser tab cannot
    // switch the account between getUser() and updateUser() on this client.
    const supabase = await createClient();
    await updatePassword(supabase, expectedUserId, password, confirmation);
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof PasswordRecoveryError
        ? error.message
        : "No pudimos actualizar la contraseña. Revisa tu conexión e inténtalo nuevamente.",
      sessionExpired: error instanceof PasswordRecoveryError && error.code === "session",
    };
  }
}
