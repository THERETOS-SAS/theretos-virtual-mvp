import type { SupabaseClient } from "@supabase/supabase-js";

type AuthClient = Pick<SupabaseClient, "auth">;
type SignupErrorCode = "validation" | "rate_limit" | "signup" | "resend";

export type SignupInput = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  confirmation: string;
};

export class SignupError extends Error {
  readonly code: SignupErrorCode;

  constructor(code: SignupErrorCode, message: string) {
    super(message);
    this.name = "SignupError";
    this.code = code;
  }
}

function normalizeEmail(email: string) {
  const normalized = typeof email === "string" ? email.trim().toLowerCase() : "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    throw new SignupError("validation", "Escribe un correo electrónico válido.");
  }
  return normalized;
}

function operationError(operation: "signup" | "resend", error: unknown) {
  const code = error && typeof error === "object" && "code" in error ? error.code : undefined;
  const status = error && typeof error === "object" && "status" in error ? error.status : undefined;
  if (status === 429 || code === "over_email_send_rate_limit") {
    return new SignupError("rate_limit", "Espera unos minutos antes de solicitar otro enlace.");
  }
  if (operation === "signup" && code === "weak_password") {
    return new SignupError("signup", "La contraseña no cumple los requisitos de seguridad. Usa una más larga y segura.");
  }
  return new SignupError(operation, operation === "signup"
    ? "No pudimos procesar el registro. Inténtalo de nuevo más tarde."
    : "No pudimos reenviar el enlace. Inténtalo de nuevo más tarde.");
}

function confirmationCallback(origin: string, operation: "signup" | "resend") {
  try {
    const callback = new URL("/auth/callback", origin);
    if (callback.protocol !== "https:" && callback.protocol !== "http:") throw new Error("Invalid origin");
    callback.searchParams.set("next", "/login?confirmed=1");
    return callback.toString();
  } catch {
    throw operationError(operation, null);
  }
}

export async function signupAccount(
  client: AuthClient,
  input: SignupInput,
  origin: string,
): Promise<"check-email" | "signed-in"> {
  const firstName = typeof input.firstName === "string" ? input.firstName.trim() : "";
  const lastName = typeof input.lastName === "string" ? input.lastName.trim() : "";
  if (!firstName || !lastName) throw new SignupError("validation", "Completa tu nombre y apellido.");
  const email = normalizeEmail(input.email);
  if (typeof input.password !== "string" || input.password.length < 8) {
    throw new SignupError("validation", "La contraseña debe tener al menos 8 caracteres.");
  }
  if (input.password !== input.confirmation) throw new SignupError("validation", "Las contraseñas no coinciden.");

  const emailRedirectTo = confirmationCallback(origin, "signup");
  let result;
  try {
    result = await client.auth.signUp({
      email,
      // Los espacios elegidos por la persona son parte de su contraseña.
      password: input.password,
      options: {
        emailRedirectTo,
        data: {
          first_name: firstName,
          last_name: lastName,
          display_name: `${firstName} ${lastName}`,
          phone: typeof input.phone === "string" ? input.phone.trim() : "",
        },
      },
    });
  } catch (error) {
    throw operationError("signup", error);
  }
  if (result.error) throw operationError("signup", result.error);
  if (!result.data?.user?.id) throw operationError("signup", null);
  const { user, session } = result.data;
  // Supabase también puede devolver un usuario ficticio para un correo existente.
  // Sin sesión, la respuesta visual es siempre la misma y no confirma su existencia.
  if (!session) return "check-email";
  if (!session.access_token || session.user?.id !== user.id) throw operationError("signup", null);
  return "signed-in";
}

export async function resendSignupConfirmation(client: AuthClient, email: string, origin: string): Promise<void> {
  const normalizedEmail = normalizeEmail(email);
  const emailRedirectTo = confirmationCallback(origin, "resend");
  let result;
  try {
    result = await client.auth.resend({
      type: "signup",
      email: normalizedEmail,
      options: { emailRedirectTo },
    });
  } catch (error) {
    throw operationError("resend", error);
  }
  if (result.error) throw operationError("resend", result.error);
  // No inspeccionar ni devolver datos que permitan inferir si existe la cuenta.
}
