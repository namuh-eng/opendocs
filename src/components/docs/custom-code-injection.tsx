"use client";

/**
 * Injects custom CSS (in <head> via style tag) and custom JS (inline script)
 * for docs site branding, analytics widgets, and third-party integrations.
 */

import { useEffect } from "react";

interface CustomCodeInjectionProps {
  customCSS: string;
  customJS: string;
}

export function CustomCodeInjection({
  customCSS,
  customJS,
}: CustomCodeInjectionProps) {
  // Inject custom CSS into <head>
  useEffect(() => {
    if (!customCSS) return;
    const style = document.createElement("style");
    style.setAttribute("data-custom-css", "true");
    style.textContent = customCSS;
    document.head.appendChild(style);
    return () => {
      style.remove();
    };
  }, [customCSS]);

  // Inject custom JS
  useEffect(() => {
    if (!customJS) return;
    const script = document.createElement("script");
    script.setAttribute("data-custom-js", "true");
    script.textContent = customJS;
    document.body.appendChild(script);
    return () => {
      script.remove();
    };
  }, [customJS]);

  return null;
}
