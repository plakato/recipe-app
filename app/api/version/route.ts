// The version (deploy) the server runs, for pages left open from an older one
// (components/VersionCheck.tsx). Public: it's a commit of the public repo.
export const dynamic = "force-dynamic";

export function GET() {
  return Response.json({ version: process.env.APP_VERSION ?? null });
}
