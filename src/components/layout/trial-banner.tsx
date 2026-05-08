"use client";

import { X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  type ResolvedDashboardTheme,
  getStoredTrialBannerDismissed,
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
          container: "bg-amber-900/30 border-amber-700/30 text-amber-200",
          title: "text-amber-100",
          link: "text-amber-200 hover:text-amber-100",
          dismiss: "text-amber-400 hover:text-amber-200",
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
