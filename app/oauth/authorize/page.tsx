import type { Metadata } from "next";
import { redirect } from "next/navigation";
import AuthCard from "@/components/AuthCard";
import { getSessionUser } from "@/lib/auth";
import { requestHost } from "@/lib/clientIp";
import { checkAuthorize, findClient, oauthUrls } from "@/lib/oauth";

export const metadata: Metadata = { title: "Pripojiť aplikáciu" };
export const dynamic = "force-dynamic";

// Where ChatGPT sends someone to connect the app: sign in (if needed), then
// allow it to read your recipes. The form posts to ./approve.
export default async function AuthorizePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const q: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw)) {
    const one = Array.isArray(v) ? v[0] : v;
    if (one !== undefined) q[k] = one;
  }

  const host = (await requestHost()) ?? "localhost";
  const origin = `${host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https"}://${host}`;
  const client = await findClient(q.client_id);
  const check = checkAuthorize(q, client, oauthUrls(origin).resource);
  if ("fatal" in check) return <AuthCard title="Pripojenie zlyhalo" error={check.fatal}>{null}</AuthCard>;
  if ("redirectError" in check) {
    const back = new URL(check.redirectUri);
    back.searchParams.set("error", check.redirectError);
    if (check.state) back.searchParams.set("state", check.state);
    redirect(back.toString());
  }

  const user = await getSessionUser();
  if (!user || user.isGuest) {
    const here = `/oauth/authorize?${new URLSearchParams(q).toString()}`;
    redirect(`/login?next=${encodeURIComponent(here)}`);
  }

  const appName = client?.name || "Aplikácia";
  return (
    <AuthCard title="Pripojiť aplikáciu">
      <form method="post" action="/oauth/authorize/approve" className="space-y-4">
        {Object.entries(q).map(([k, v]) => (
          <input key={k} type="hidden" name={k} value={v} />
        ))}
        <p className="text-stone-700 dark:text-stone-300">
          <strong>{appName}</strong> chce čítať vaše recepty, aby vám vedel poradiť, čo uvariť. Nič v
          nich nemôže zmeniť ani zmazať.
        </p>
        <p className="text-sm text-stone-500">Prihlásený účet: {user.email}</p>
        <div className="flex gap-3">
          <button
            type="submit"
            name="decision"
            value="allow"
            className="flex-1 rounded-lg bg-olive-600 px-4 py-2.5 font-medium text-white hover:bg-olive-700"
          >
            Povoliť
          </button>
          <button
            type="submit"
            name="decision"
            value="deny"
            className="flex-1 rounded-lg border border-stone-300 px-4 py-2.5 font-medium text-stone-700 hover:bg-stone-50 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800"
          >
            Zamietnuť
          </button>
        </div>
      </form>
    </AuthCard>
  );
}
