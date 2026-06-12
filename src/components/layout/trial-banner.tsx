"use client";

import { X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  getStoredTrialBannerDismissed,
  type ResolvedDashboardTheme,
  setStoredTrialBannerDismissed,
} from "./shell-preferences";

export function TrialBanner({
  theme = "dark",
}: {
  theme?: ResolvedDashboardTheme;
}) {
  const [dismissed, setDismissed] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setDismissed(getStoredTrialBannerDismissed());
    setReady(true);
  }, []);

  if (!ready || dismissed) return null;

  const bannerTheme =
    theme === "light"
      ? {
          container: "bg-amber-100 border-amber-200 text-amber-900",
          title: "text-amber-950",
          link: "text-amber-800 hover:text-amber-950",
          dismiss: "text-amber-700 hover:text-amber-950",
        }
      : {
          container:
            "bg-[var(--od-gold-soft,#f4ecd2)] border-[var(--od-gold,#c9a649)] text-[var(--od-text)]",
          title: "text-[var(--od-text)]",
          link: "text-[var(--od-gold,#c9a649)] hover:text-[var(--od-text)]",
          dismiss: "text-[var(--od-gold,#c9a649)] hover:text-[var(--od-text)]",
        };

  return (
    <div
      className={`flex items-center justify-between border-b px-4 py-2 text-sm ${bannerTheme.container}`}
      data-testid="trial-banner"
    >
      <p>
        <strong className={bannerTheme.title}>
          Your team is on a free trial.
        </strong>{" "}
        Your trial ends on May 18, 2026. You will be switched to the Hobby plan
        after.
      </p>
      <div className="flex items-center gap-3 shrink-0">
        <Link
          href="/settings"
          className={`font-medium underline underline-offset-2 ${bannerTheme.link}`}
        >
          Explore upgrades
        </Link>
        <button
          type="button"
          onClick={() => {
            setDismissed(true);
            setStoredTrialBannerDismissed(true);
          }}
          className={`transition-colors ${bannerTheme.dismiss}`}
          aria-label="Dismiss banner"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
