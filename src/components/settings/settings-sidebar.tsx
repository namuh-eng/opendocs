"use client";

import { SETTINGS_NAV, isActiveSettingsItem } from "@/lib/settings-nav";
import { clsx } from "clsx";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function SettingsSidebar() {
  const pathname = usePathname();

  return (
    <nav
      data-testid="settings-sidebar"
      className="flex w-56 shrink-0 flex-col gap-6 border-r border-[var(--od-border)] py-6 pr-4"
    >
      {SETTINGS_NAV.map((group) => (
        <div key={group.heading}>
          <h3 className="mb-1.5 px-3 text-xs font-medium uppercase text-[var(--od-text-subtle)]">
            {group.heading}
          </h3>
          <ul className="space-y-0.5">
            {group.items.map((item) => {
              const active = isActiveSettingsItem(pathname, item.href);
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    data-testid={`settings-nav-${item.href.split("/").pop()}`}
                    data-active={active || undefined}
                    className={clsx(
                      "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                      active
                        ? "bg-[var(--od-sidebar-active-bg)] text-[var(--od-text)]"
                        : "text-[var(--od-text-muted)] hover:bg-[var(--od-panel-muted)] hover:text-[var(--od-text)]",
                    )}
                  >
                    <Icon size={16} className="shrink-0" />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
