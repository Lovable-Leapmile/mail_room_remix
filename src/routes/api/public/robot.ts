import { createFileRoute } from "@tanstack/react-router";
import { ROBOT_BASE, apiHeaders } from "@/lib/api-config";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
} as const;

const ALLOWED = new Set(["retrieve_tray", "is_tray_ready", "release_tray"]);

async function proxy(request: Request) {
  const url = new URL(request.url);
  const action = url.searchParams.get("action") ?? "";
  if (!ALLOWED.has(action)) {
    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { "Content-Type": "application/json", ...CORS },
    });
  }
  const params = new URLSearchParams(url.searchParams);
  params.delete("action");
  const target = `${ROBOT_BASE}/${action}?${params.toString()}`;

  try {
    const res = await fetch(target, {
      method: request.method,
      headers: apiHeaders,
      ...(request.method === "POST" ? { body: "" } : {}),
    });
    const text = await res.text();
    return new Response(text, {
      status: res.status,
      headers: {
        "Content-Type": res.headers.get("content-type") ?? "application/json",
        ...CORS,
      },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 502,
      headers: { "Content-Type": "application/json", ...CORS },
    });
  }
}

export const Route = createFileRoute("/api/public/robot")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      GET: async ({ request }) => proxy(request),
      POST: async ({ request }) => proxy(request),
      PATCH: async ({ request }) => proxy(request),
    },
  },
});
