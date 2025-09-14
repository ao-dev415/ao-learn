export const onRequestPost: PagesFunction = async ({ request, env }) => {
  const { key } = await request.json().catch(() => ({}));
  if (!key || key !== env.AO_FULL_KEY) {
    return new Response(JSON.stringify({ ok:false }), { status: 403, headers: { "content-type": "application/json" } });
  }
  const headers = new Headers({ "content-type": "application/json" });
  // 30-day cookie
  headers.append("set-cookie", "ao_full=1; Path=/; Max-Age=2592000; Secure; HttpOnly; SameSite=Lax");
  return new Response(JSON.stringify({ ok:true }), { status: 200, headers });
};
