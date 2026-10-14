// The answer from the approval form on /oauth/authorize: back to the app
// with a one-time code, or with access_denied.
import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { isSameOrigin, siteUrl } from "@/lib/auth-forms";
import { checkAuthorize, createCode, findClient, oauthUrls } from "@/lib/oauth";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return new NextResponse("Cross-site request refused.", { status: 403 });
  const form = await request.formData();
  const q: Record<string, string> = {};
  for (const [k, v] of form.entries()) if (typeof v === "string") q[k] = v;

  const user = await getSessionUser();
  if (!user || user.isGuest) return NextResponse.redirect(siteUrl(request, "/login"), 303);

  const client = await findClient(q.client_id);
  const check = checkAuthorize(q, client, oauthUrls(siteUrl(request, "/").origin).resource);
  if ("fatal" in check) return new NextResponse(check.fatal, { status: 400 });

  const back = new URL("ok" in check ? check.ok.redirectUri : check.redirectUri);
  if ("redirectError" in check) back.searchParams.set("error", check.redirectError);
  else if (q.decision !== "allow") back.searchParams.set("error", "access_denied");
  else back.searchParams.set("code", await createCode(check.ok, user.id));
  const state = "ok" in check ? check.ok.state : check.state;
  if (state) back.searchParams.set("state", state);
  return NextResponse.redirect(back, 303);
}
