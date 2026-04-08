import { NextResponse } from "next/server";

/**
 * POST /api/docs/proxy — forwards API playground requests to avoid CORS.
 * Accepts { method, url, headers, body } and returns { status, body, headers }.
 */
export async function POST(req: Request): Promise<NextResponse> {
  try {
    const payload = await req.json();
    const { method, url, headers, body } = payload as {
      method: string;
      url: string;
      headers?: Record<string, string>;
      body?: string;
    };

    if (!url || !method) {
      return NextResponse.json(
        { error: "Missing method or url" },
        { status: 400 },
      );
    }

    // Validate URL to prevent SSRF against internal services
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
    }

    // Block requests to localhost/internal IPs
    const hostname = parsedUrl.hostname.toLowerCase();
    if (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "0.0.0.0" ||
      hostname === "::1" ||
      hostname.startsWith("10.") ||
      hostname.startsWith("192.168.") ||
      hostname.startsWith("172.") ||
      hostname.endsWith(".internal") ||
      hostname.endsWith(".local")
    ) {
      return NextResponse.json(
        { error: "Requests to internal addresses are not allowed" },
        { status: 403 },
      );
    }

    const fetchHeaders: Record<string, string> = {};
    if (headers) {
      for (const [key, value] of Object.entries(headers)) {
        // Skip host/origin headers
        const lower = key.toLowerCase();
        if (lower !== "host" && lower !== "origin" && lower !== "referer") {
          fetchHeaders[key] = value;
        }
      }
    }

    const fetchOptions: RequestInit = {
      method,
      headers: fetchHeaders,
    };

    if (body && method !== "GET" && method !== "HEAD") {
      fetchOptions.body = body;
    }

    const response = await fetch(url, fetchOptions);
    const responseBody = await response.text();

    // Collect response headers
    const responseHeaders: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });

    return NextResponse.json({
      status: response.status,
      body: responseBody,
      headers: responseHeaders,
    });
  } catch (err) {
    return NextResponse.json(
      {
        status: 0,
        body: err instanceof Error ? err.message : "Proxy request failed",
        headers: {},
      },
      { status: 502 },
    );
  }
}
