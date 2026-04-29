import { getClientRateLimitKey } from "@/lib/client-rate-limit-key";
import { createRequestId, logger } from "@/lib/logger";
import { applyRateLimit, buildRateLimitHeaders } from "@/lib/rate-limit";
import { assertSafeProxyUrl } from "@/lib/ssrf-protection";
import { NextResponse } from "next/server";

/**
 * POST /api/docs/proxy — forwards API playground requests to avoid CORS.
 * Accepts { method, url, headers, body } and returns { status, body, headers }.
 */
export async function POST(req: Request): Promise<NextResponse> {
  const requestId = createRequestId();
  const rateLimitKey = getClientRateLimitKey(req.headers, "docs-proxy");
  const rateLimit = applyRateLimit({
    key: rateLimitKey,
    limit: 20,
    windowMs: 60_000,
  });
  if (!rateLimit.allowed) {
    logger.warn("docs_proxy_rate_limited", {
      requestId,
      route: "/api/docs/proxy",
      method: "POST",
      rateLimitKey,
    });
    return NextResponse.json(
      { error: "Too many proxy requests" },
      { status: 429, headers: buildRateLimitHeaders(rateLimit) },
    );
  }
  try {
    const payload = await req.json();
    const { method, url, headers, body } = payload as {
      method: string;
      url: string;
      headers?: Record<string, string>;
      body?: string;
    };

    if (!url || !method) {
      logger.warn("docs_proxy_missing_method_or_url", {
        requestId,
        route: "/api/docs/proxy",
        method: "POST",
      });
      return NextResponse.json(
        { error: "Missing method or url" },
        { status: 400 },
      );
    }

    // Validate URL to prevent SSRF against internal services
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch (error) {
      logger.warn("docs_proxy_invalid_url", {
        requestId,
        route: "/api/docs/proxy",
        method: "POST",
        url,
        error: error instanceof Error ? error.message : "unknown",
      });
      return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
    }

    try {
      await assertSafeProxyUrl(parsedUrl);
    } catch (error) {
      logger.warn("docs_proxy_blocked_internal_address", {
        requestId,
        route: "/api/docs/proxy",
        method: "POST",
        hostname: parsedUrl.hostname,
        error: error instanceof Error ? error.message : "unsafe target",
      });
      return NextResponse.json(
        {
          error:
            error instanceof Error
              ? error.message
              : "Requests to this address are not allowed",
        },
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

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10_000); // 10s timeout

    const fetchOptions: RequestInit = {
      method,
      headers: fetchHeaders,
      signal: controller.signal,
    };

    if (body && method !== "GET" && method !== "HEAD") {
      fetchOptions.body = body;
    }

    const response = await fetch(parsedUrl.toString(), fetchOptions);
    clearTimeout(timeoutId);
    const responseBody = await response.text();

    // Collect response headers
    const responseHeaders: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });

    logger.info("docs_proxy_completed", {
      requestId,
      route: "/api/docs/proxy",
      method: "POST",
      targetHost: parsedUrl.hostname,
      targetMethod: method,
      responseStatus: response.status,
    });

    return NextResponse.json(
      {
        status: response.status,
        body: responseBody,
        headers: responseHeaders,
        requestId,
      },
      { headers: buildRateLimitHeaders(rateLimit) },
    );
  } catch (err) {
    logger.error("docs_proxy_failed", {
      requestId,
      route: "/api/docs/proxy",
      method: "POST",
      error:
        err instanceof Error
          ? { message: err.message, stack: err.stack }
          : String(err),
    });
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
