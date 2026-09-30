import { NextResponse } from "next/server";
import { authCallbackDestination } from "@/lib/auth-redirect";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);

  const destination = await authCallbackDestination(requestUrl.searchParams, async (code) => {
    const supabase = await createClient();
    return supabase.auth.exchangeCodeForSession(code);
  });

  // Keep the browser's origin behind Codespaces/reverse proxies. request.url
  // can contain the internal host. destination is a validated relative path.
  return new NextResponse(null, {
    status: 307,
    headers: { Location: destination, "Cache-Control": "no-store" },
  });
}
