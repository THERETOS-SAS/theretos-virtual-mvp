const INTERNAL_ORIGIN = "https://theretos.invalid";

function normalizeInternalPath(value: string | null): string | null {
  if (!value?.startsWith("/") || value.startsWith("//")) return null;

  try {
    const destination = new URL(value, INTERNAL_ORIGIN);
    if (destination.origin !== INTERNAL_ORIGIN || destination.pathname.startsWith("//")) {
      return null;
    }
    return `${destination.pathname}${destination.search}${destination.hash}`;
  } catch {
    return null;
  }
}

export function safeInternalPath(value: string | null, fallback = "/profile"): string {
  return normalizeInternalPath(value) ?? normalizeInternalPath(fallback) ?? "/profile";
}

type CodeExchange = (code: string) => Promise<{
  data: { user: unknown } | null;
  error: unknown;
}>;

export async function authCallbackDestination(
  params: URLSearchParams,
  exchangeCode: CodeExchange,
): Promise<string> {
  const next = safeInternalPath(params.get("next"));
  const recovery = new URL(next, INTERNAL_ORIGIN).pathname === "/reset-password";
  const failure = recovery
    ? "/forgot-password?error=recovery_link"
    : "/login?error=confirmation";

  // Supabase error descriptions are untrusted and must not reach the redirect.
  if (["error", "error_code", "error_description"].some((key) => params.has(key))) {
    return failure;
  }

  const code = params.get("code");
  if (!code) return recovery ? failure : "/login?error=missing_code";

  try {
    const { data, error } = await exchangeCode(code);
    if (error || !data?.user) return failure;
    return next;
  } catch {
    return failure;
  }
}
