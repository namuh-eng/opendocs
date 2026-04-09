"use client";

import { authClient } from "@/lib/auth-client";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import {
  Bell,
  BookOpen,
  CreditCard,
  HelpCircle,
  LogOut,
  Menu,
  MessageSquare,
  Monitor,
  Moon,
  Search,
  Sun,
  User,
  UserPlus,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  type DashboardTheme,
  type ResolvedDashboardTheme,
  setStoredDashboardTheme,
} from "./shell-preferences";

interface TopBarProps {
  onThemeChange: (theme: DashboardTheme) => void;
  onToggleSidebar?: () => void;
  resolvedTheme: ResolvedDashboardTheme;
  showMobileSidebarToggle?: boolean;
  theme: DashboardTheme;
  userName?: string;
  userEmail?: string;
  userImage?: string;
}

export function TopBar({
  onThemeChange,
  onToggleSidebar,
  resolvedTheme,
  showMobileSidebarToggle = false,
  theme,
  userName,
  userEmail,
  userImage,
}: TopBarProps) {
  const router = useRouter();

  const handleLogout = async () => {
    await authClient.signOut();
    router.push("/login");
  };

  const initials = userName
    ? userName
        .split(" ")
        .map((name) => name[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : (userEmail?.charAt(0).toUpperCase() ?? "?");

  const shellTheme =
    resolvedTheme === "light"
      ? {
          header: "border-slate-200 bg-white/90",
          button: "text-slate-500 hover:bg-slate-100 hover:text-slate-950",
          borderedButton:
            "border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-950",
          keyboard: "bg-slate-100 text-slate-500",
          avatar: "bg-emerald-600 text-white hover:ring-slate-300",
          menu: "bg-white border-slate-200 shadow-xl shadow-slate-900/10",
          menuText: "text-slate-700 hover:bg-slate-100 hover:text-slate-950",
          menuMuted: "text-slate-500",
          divider: "border-slate-200",
          themeActive: "bg-slate-900 text-white",
          themeInactive:
            "text-slate-500 hover:bg-slate-100 hover:text-slate-950",
          surface: "bg-slate-100",
          logout: "text-red-600 hover:bg-red-50 hover:text-red-700",
        }
      : {
          header: "border-white/[0.08] bg-[#0f0f0f]/80",
          button: "text-gray-400 hover:bg-white/[0.06] hover:text-gray-200",
          borderedButton:
            "border-white/[0.08] text-gray-500 hover:bg-white/[0.06] hover:text-gray-300",
          keyboard: "bg-white/[0.06] text-gray-500",
          avatar: "bg-emerald-600 text-white hover:ring-white/20",
          menu: "bg-[#1a1a1a] border-white/[0.08] shadow-xl",
          menuText: "text-gray-300 hover:bg-white/[0.06] hover:text-white",
          menuMuted: "text-gray-500",
          divider: "border-white/[0.08]",
          themeActive: "bg-white/[0.08] text-white",
          themeInactive: "text-gray-400 hover:bg-white/[0.08] hover:text-white",
          surface: "bg-white/[0.04]",
          logout: "text-red-400 hover:bg-white/[0.06] hover:text-red-300",
        };

  const handleThemeChange = (nextTheme: DashboardTheme) => {
    setStoredDashboardTheme(nextTheme);
    onThemeChange(nextTheme);
  };

  return (
    <header
      className={`flex h-12 items-center justify-between border-b px-4 backdrop-blur-sm ${shellTheme.header}`}
      data-testid="top-bar"
    >
      <div className="flex flex-1 items-center gap-2">
        {showMobileSidebarToggle && (
          <button
            type="button"
            onClick={onToggleSidebar}
            className={`rounded-md p-2 transition-colors lg:hidden ${shellTheme.button}`}
            aria-label="Open sidebar"
            data-testid="sidebar-mobile-toggle"
          >
            <Menu size={18} />
          </button>
        )}
      </div>

      <div className="flex items-center gap-1">
        <button
          type="button"
          className={`flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm transition-colors ${shellTheme.borderedButton}`}
          aria-label="Search"
        >
          <Search size={14} />
          <span className={`hidden sm:inline ${shellTheme.menuMuted}`}>
            Search
          </span>
          <kbd
            className={`hidden items-center gap-0.5 rounded px-1.5 py-0.5 font-mono text-[10px] sm:inline-flex ${shellTheme.keyboard}`}
          >
            ⌘K
          </kbd>
        </button>

        <button
          type="button"
          className={`relative rounded-md p-2 transition-colors ${shellTheme.button}`}
          aria-label="Notifications"
        >
          <Bell size={18} />
        </button>

        <button
          type="button"
          className={`rounded-md p-2 transition-colors ${shellTheme.button}`}
          aria-label="Chat"
        >
          <MessageSquare size={18} />
        </button>

        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button
              type="button"
              className={`ml-1 flex h-8 w-8 items-center justify-center overflow-hidden rounded-full text-xs font-bold transition-all hover:ring-2 ${shellTheme.avatar}`}
              aria-label="Profile menu"
            >
              {userImage ? (
                <img
                  src={userImage}
                  alt={userName ?? "Profile"}
                  className="h-full w-full object-cover"
                />
              ) : (
                initials
              )}
            </button>
          </DropdownMenu.Trigger>

          <DropdownMenu.Portal>
            <DropdownMenu.Content
              className={`z-50 min-w-[220px] rounded-lg border py-1 ${shellTheme.menu}`}
              align="end"
              sideOffset={8}
            >
              <div className={`border-b px-3 py-2 ${shellTheme.divider}`}>
                <p className="truncate text-sm font-medium">
                  {userName ?? "User"}
                </p>
                <p className={`truncate text-xs ${shellTheme.menuMuted}`}>
                  {userEmail}
                </p>
              </div>

              <DropdownMenu.Item asChild>
                <Link
                  href="/settings/workspace/profile"
                  className={`flex cursor-pointer items-center gap-2.5 px-3 py-2 text-sm outline-none ${shellTheme.menuText}`}
                >
                  <User size={14} />
                  Your profile
                </Link>
              </DropdownMenu.Item>
              <DropdownMenu.Item asChild>
                <Link
                  href="/settings/workspace/members"
                  className={`flex cursor-pointer items-center gap-2.5 px-3 py-2 text-sm outline-none ${shellTheme.menuText}`}
                >
                  <UserPlus size={14} />
                  Invite members
                </Link>
              </DropdownMenu.Item>
              <DropdownMenu.Item asChild>
                <Link
                  href="/settings"
                  className={`flex cursor-pointer items-center gap-2.5 px-3 py-2 text-sm outline-none ${shellTheme.menuText}`}
                >
                  <CreditCard size={14} />
                  Billing
                </Link>
              </DropdownMenu.Item>

              <DropdownMenu.Separator
                className={`my-1 border-t ${shellTheme.divider}`}
              />

              <div className="px-3 py-2">
                <p className={`mb-1.5 text-xs ${shellTheme.menuMuted}`}>
                  Theme
                </p>
                <div
                  className={`flex items-center gap-1 rounded-md p-0.5 ${shellTheme.surface}`}
                >
                  <button
                    type="button"
                    onClick={() => handleThemeChange("system")}
                    className={`flex flex-1 items-center justify-center gap-1 rounded px-2 py-1 text-xs transition-colors ${
                      theme === "system"
                        ? shellTheme.themeActive
                        : shellTheme.themeInactive
                    }`}
                    data-testid="theme-system"
                  >
                    <Monitor size={12} />
                    System
                  </button>
                  <button
                    type="button"
                    onClick={() => handleThemeChange("light")}
                    className={`flex flex-1 items-center justify-center gap-1 rounded px-2 py-1 text-xs transition-colors ${
                      theme === "light"
                        ? shellTheme.themeActive
                        : shellTheme.themeInactive
                    }`}
                    data-testid="theme-light"
                  >
                    <Sun size={12} />
                    Light
                  </button>
                  <button
                    type="button"
                    onClick={() => handleThemeChange("dark")}
                    className={`flex flex-1 items-center justify-center gap-1 rounded px-2 py-1 text-xs transition-colors ${
                      theme === "dark"
                        ? shellTheme.themeActive
                        : shellTheme.themeInactive
                    }`}
                    data-testid="theme-dark"
                  >
                    <Moon size={12} />
                    Dark
                  </button>
                </div>
              </div>

              <DropdownMenu.Separator
                className={`my-1 border-t ${shellTheme.divider}`}
              />

              <DropdownMenu.Item asChild>
                <a
                  href="/docs"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex cursor-pointer items-center gap-2.5 px-3 py-2 text-sm outline-none ${shellTheme.menuText}`}
                >
                  <BookOpen size={14} />
                  Documentation
                </a>
              </DropdownMenu.Item>
              <DropdownMenu.Item asChild>
                <a
                  href="mailto:support@example.com"
                  className={`flex cursor-pointer items-center gap-2.5 px-3 py-2 text-sm outline-none ${shellTheme.menuText}`}
                >
                  <HelpCircle size={14} />
                  Contact support
                </a>
              </DropdownMenu.Item>

              <DropdownMenu.Separator
                className={`my-1 border-t ${shellTheme.divider}`}
              />

              <DropdownMenu.Item
                onSelect={handleLogout}
                className={`flex cursor-pointer items-center gap-2.5 px-3 py-2 text-sm outline-none ${shellTheme.logout}`}
              >
                <LogOut size={14} />
                Log Out
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>
    </header>
  );
}
