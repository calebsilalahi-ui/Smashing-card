import { NextResponse } from "next/server";
import { getAuthedUser } from "@/lib/supabase/server";
import { fetchMember } from "@/lib/member";

export const dynamic = "force-dynamic";

export async function GET() {
  const authed = await getAuthedUser();
  if (!authed) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const member = await fetchMember(authed.supabase, authed.user.id);
  if (!member) return NextResponse.json({ error: "profile_not_found" }, { status: 404 });
  return NextResponse.json({ member }, { headers: { "Cache-Control": "no-store" } });
}
