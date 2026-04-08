"use client";

import { useEffect, useRef } from "react";

interface ApiPlaygroundProps {
  html: string;
}

/**
 * Client-side API playground — wires up Send buttons, parameter inputs,
 * response display, and response tab switching.
 */
export function ApiPlayground({ html }: ApiPlaygroundProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: html triggers re-wiring
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Wire up Send buttons
    const sendButtons =
      container.querySelectorAll<HTMLButtonElement>(".api-send-btn");
    for (const btn of sendButtons) {
      btn.addEventListener("click", () => handleSend(btn));
    }

    // Wire up response tab switching
    const respTabButtons =
      container.querySelectorAll<HTMLButtonElement>(".api-resp-tab");
    for (const btn of respTabButtons) {
      btn.addEventListener("click", () => {
        const playground = btn.closest(".api-playground");
        if (!playground) return;
        const tab = btn.dataset.respTab;

        // Deactivate all tabs
        const allTabs =
          playground.querySelectorAll<HTMLButtonElement>(".api-resp-tab");
        for (const t of allTabs) t.classList.remove("active");
        btn.classList.add("active");

        // Show/hide panels
        const bodyPanel =
          playground.querySelector<HTMLDivElement>(".api-response-body");
        const headersPanel = playground.querySelector<HTMLDivElement>(
          ".api-response-headers",
        );
        if (bodyPanel)
          bodyPanel.style.display = tab === "body" ? "block" : "none";
        if (headersPanel)
          headersPanel.style.display = tab === "headers" ? "block" : "none";
      });
    }
  }, [html]);

  return (
    <div
      ref={containerRef}
      className="api-playground-container"
      // biome-ignore lint/security/noDangerouslySetInnerHtml: API playground HTML is server-generated from trusted OpenAPI spec
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

async function handleSend(btn: HTMLButtonElement): Promise<void> {
  const playground = btn.closest(".api-playground");
  if (!playground) return;

  const method = btn.dataset.method || "get";
  const path = btn.dataset.path || "/";
  const baseUrl = btn.dataset.baseUrl || "";

  // Collect path parameters and build URL
  let resolvedPath = path;
  const queryParts: string[] = [];
  const headers: Record<string, string> = {};

  const inputs =
    playground.querySelectorAll<HTMLInputElement>(".api-param-input");
  for (const input of inputs) {
    const name = input.dataset.paramName || "";
    const location = input.dataset.paramIn || "";
    const value = input.value.trim();
    if (!value) continue;

    switch (location) {
      case "path":
        resolvedPath = resolvedPath.replace(
          `{${name}}`,
          encodeURIComponent(value),
        );
        break;
      case "query":
        queryParts.push(
          `${encodeURIComponent(name)}=${encodeURIComponent(value)}`,
        );
        break;
      case "header":
        headers[name] = value;
        break;
    }
  }

  const queryString = queryParts.length > 0 ? `?${queryParts.join("&")}` : "";
  const fullUrl = `${baseUrl}${resolvedPath}${queryString}`;

  // Collect body
  const bodyTextarea =
    playground.querySelector<HTMLTextAreaElement>(".api-body-textarea");
  let body: string | undefined;
  if (bodyTextarea?.value.trim()) {
    body = bodyTextarea.value.trim();
    if (!headers["Content-Type"]) {
      headers["Content-Type"] =
        bodyTextarea.dataset.contentType || "application/json";
    }
  }

  // Show loading state
  btn.disabled = true;
  btn.textContent = "Sending...";

  const responseArea =
    playground.querySelector<HTMLDivElement>(".api-response");
  const statusEl =
    playground.querySelector<HTMLSpanElement>(".api-status-code");
  const timeEl =
    playground.querySelector<HTMLSpanElement>(".api-response-time");
  const bodyContent = playground.querySelector<HTMLElement>(
    ".api-response-content",
  );
  const headersContent = playground.querySelector<HTMLElement>(
    ".api-response-headers-content",
  );

  const startTime = performance.now();

  try {
    // Use the proxy route to avoid CORS
    const proxyRes = await fetch("/api/docs/proxy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        method: method.toUpperCase(),
        url: fullUrl,
        headers,
        body,
      }),
    });

    const elapsed = Math.round(performance.now() - startTime);
    const result = await proxyRes.json();

    if (responseArea) responseArea.style.display = "block";
    if (statusEl) {
      statusEl.textContent = `${result.status}`;
      statusEl.className = `api-status-code status-${Math.floor(result.status / 100)}xx`;
    }
    if (timeEl) timeEl.textContent = `${elapsed}ms`;

    // Format response body
    if (bodyContent) {
      let formatted = result.body || "";
      try {
        formatted = JSON.stringify(JSON.parse(formatted), null, 2);
      } catch {
        // not JSON, display raw
      }
      bodyContent.textContent = formatted;
    }

    // Format response headers
    if (headersContent) {
      const headerLines = Object.entries(result.headers || {})
        .map(([k, v]) => `${k}: ${v}`)
        .join("\n");
      headersContent.textContent = headerLines;
    }
  } catch (err) {
    if (responseArea) responseArea.style.display = "block";
    if (statusEl) {
      statusEl.textContent = "Error";
      statusEl.className = "api-status-code status-5xx";
    }
    if (bodyContent) {
      bodyContent.textContent =
        err instanceof Error ? err.message : "Request failed";
    }
  } finally {
    btn.disabled = false;
    btn.textContent = "Send";
  }
}
