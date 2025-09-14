export const onRequest: PagesFunction = async (ctx) => {
  const { request, next } = ctx;
  const url = new URL(request.url);
  if (url.pathname.startsWith("/full/")) {
    const cookie = request.headers.get("cookie") || "";
    if (!/ao_full=1(;|$)/.test(cookie)) {
      // Hide existence of full assets
      return new Response("Not found", { status: 404 });
    }
  }
  return next();
};
