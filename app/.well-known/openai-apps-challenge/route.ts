// OpenAI's check that we own this domain, for the ChatGPT app directory: the
// token they give us, from OPENAI_APPS_CHALLENGE in .env.
export function GET() {
  const token = process.env.OPENAI_APPS_CHALLENGE;
  if (!token) return new Response("Not found", { status: 404 });
  return new Response(token, { headers: { "Content-Type": "text/plain" } });
}
