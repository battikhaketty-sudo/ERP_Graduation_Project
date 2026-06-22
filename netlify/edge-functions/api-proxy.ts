import type { Config } from "@netlify/edge-functions";

const API_ORIGIN = (
  Netlify.env.get("VITE_API_PROXY_TARGET") ?? "http://mag-erp-system.runasp.net"
).replace(/\/$/, "");

export default async (request: Request): Promise<Response> => {
  const url = new URL(request.url);
  const targetUrl = `${API_ORIGIN}${url.pathname}${url.search}`;

  const headers = new Headers(request.headers);
  headers.delete("host");

  const hasBody = !["GET", "HEAD"].includes(request.method);

  try {
    return await fetch(targetUrl, {
      method: request.method,
      headers,
      body: hasBody ? request.body : undefined,
    });
  } catch (error) {
    console.error("API proxy error:", error);

    return new Response(
      JSON.stringify({
        success: false,
        code: "Proxy.Error.Unreachable",
        message: "تعذر الوصول إلى السيرفر الخلفي.",
      }),
      {
        status: 502,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
};

export const config: Config = {
  path: "/api/*",
};
