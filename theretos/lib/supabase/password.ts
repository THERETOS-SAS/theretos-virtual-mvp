import type { SupabaseClient } from "@supabase/supabase-js";

type AuthClient = Pick<SupabaseClient, "auth">;
type PasswordRecoveryErrorCode = "validation" | "session" | "request" | "update";

export class PasswordRecoveryError extends Error {
  readonly code: PasswordRecoveryErrorCode;

  constructor(code: PasswordRecoveryErrorCode, message: string) {
    super(message);
    this.name = "PasswordRecoveryError";
    this.code = code;
  }
}

function errorDetails(error: unknown) {
  if (!error || typeof error !== "object") return { code: undefined, status: undefined };
  return {
    code: "code" in error ? error.code : undefined,
    status: "status" in error ? error.status : undefined,
  };
}

function requestError(error: unknown) {
  const { code, status } = errorDetails(error);
  return new PasswordRecoveryError("request", status === 429 || code === "over_email_send_rate_limit"
    ? "Espera unos minutos antes de solicitar otro enlace."
    : "No pudimos procesar la solicitud. Inténtalo de nuevo más tarde.");
}

function sessionError() {
  return new PasswordRecoveryError("session", "Tu sesión cambió o expiró. Solicita un nuevo enlace de recuperación.");
}

function updateError(error: unknown) {
  const { code, status } = errorDetails(error);
  if (status === 401 || code === "session_not_found" || code === "session_expired" || code === "bad_jwt") {
    return sessionError();
  }
  if (code === "same_password") {
    return new PasswordRecoveryError("update", "Elige una contraseña diferente de la actual.");
  }
  if (code === "weak_password") {
    return new PasswordRecoveryError("update", "La contraseña no cumple los requisitos de seguridad. Usa una más larga y segura.");
  }
  return new PasswordRecoveryError("update", "No pudimos actualizar la contraseña. Inténtalo de nuevo más tarde.");
}

export async function requestPasswordRecovery(client: AuthClient, email: string, origin: string): Promise<void> {
  const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    throw new PasswordRecoveryError("validation", "Escribe un correo electrónico válido.");
  }

  let redirectTo: string;
  try {
    const callback = new URL("/auth/callback", origin);
    if (callback.protocol !== "https:" && callback.protocol !== "http:") throw new Error("Invalid origin");
    callback.searchParams.set("next", "/reset-password");
    redirectTo = callback.toString();
  } catch {
    throw requestError(null);
  }

  let result;
  try {
    result = await client.auth.resetPasswordForEmail(normalizedEmail, { redirectTo });
  } catch (error) {
    throw requestError(error);
  }
  if (result.error) throw requestError(result.error);
  // No devolver datos que permitan distinguir si existe una cuenta con ese correo.
}

export function getPasswordValidationError(password: unknown, confirmation: unknown): string | null {
  if (typeof password !== "string" || typeof confirmation !== "string") {
    return "Escribe y confirma tu nueva contraseña.";
  }
  if (password.length < 8) return "La contraseña debe tener al menos 8 caracteres.";
  if (password !== confirmation) return "Las contraseñas no coinciden.";
  return null;
}

export async function updatePassword(
  client: AuthClient,
  expectedUserId: string,
  password: unknown,
  confirmation: unknown,
): Promise<void> {
  // Debe recibir un cliente Supabase de servidor NUEVO por petición, ligado a
  // sus cookies; no usar un cliente global ni un cliente compartido del navegador.
  const validationError = getPasswordValidationError(password, confirmation);
  if (validationError || typeof password !== "string") {
    throw new PasswordRecoveryError("validation", validationError ?? "Escribe una contraseña válida.");
  }

  let identity;
  try {
    identity = await client.auth.getUser();
  } catch {
    throw sessionError();
  }
  if (identity.error || !expectedUserId || !identity.data.user || identity.data.user.id !== expectedUserId) {
    throw sessionError();
  }

  let result;
  try {
    // Conservar los espacios: forman parte de la contraseña elegida.
    result = await client.auth.updateUser({ password });
  } catch (error) {
    throw updateError(error);
  }
  if (result.error) throw updateError(result.error);
  if (!result.data.user) throw updateError(null);
  if (result.data.user.id !== expectedUserId) throw sessionError();
}
