import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { parseConsentTypes, recordConsents } from "@/lib/consent";

export const dynamic = "force-dynamic";

/** OAuth (PKCE) callback: exchanges the code, then writes the landing-page consents into consent_logs. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const nextParam = url.searchParams.get("next") || "/card";
  const next = nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/card";
  const consents = parseConsentTypes(url.searchParams.get("c"));

  const supabase = await getServerSupabase();
  if (!code || !supabase) return NextResponse.redirect(new URL("/?auth_error=1", url.origin));

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.user) return NextResponse.redirect(new URL("/?auth_error=1", url.origin));

  // Terms & Privacy consent is mandatory; without it we do not proceed (consent gate was bypassed).
  if (!consents.includes("terms_privacy")) {
    await supabase.auth.signOut();
    return NextResponse.redirect(new URL("/?consent_required=1", url.origin));
  }

  const admin = getAdminSupabase();
  if (admin) {
    await recordConsents(admin, data.user.id, consents, true, req.headers.get("user-agent"));
  }
  return NextResponse.redirect(new URL(next, url.origin));
}
