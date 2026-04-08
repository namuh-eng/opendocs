"use client";

import {
  type TrafficSource,
  formatDateRange,
  getDatePresets,
  getTabsForSource,
  parseDateParam,
  parseTrafficSource,
} from "@/lib/analytics";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

// ── Calendar Grid ─────────────────────────────────────────────────────────────

function CalendarGrid({
  month,
  year,
  selectedFrom,
  selectedTo,
  onSelectDate,
}: {
  month: number;
  year: number;
  selectedFrom: Date | null;
  selectedTo: Date | null;
  onSelectDate: (date: Date) => void;
}) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDow = firstDay.getDay(); // 0=Sun
  const daysInMonth = lastDay.getDate();

  // Previous month padding
  const prevMonth = new Date(year, month, 0);
  const prevDays = prevMonth.getDate();

  const weeks: (Date | null)[][] = [];
  let currentWeek: (Date | null)[] = [];

  // Fill leading days from previous month
  for (let i = startDow - 1; i >= 0; i--) {
    currentWeek.push(new Date(year, month - 1, prevDays - i));
  }

  for (let d = 1; d <= daysInMonth; d++) {
    currentWeek.push(new Date(year, month, d));
    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  }

  // Fill trailing days
  if (currentWeek.length > 0) {
    let nextDay = 1;
    while (currentWeek.length < 7) {
      currentWeek.push(new Date(year, month + 1, nextDay++));
    }
    weeks.push(currentWeek);
  }

  function isSameDay(a: Date | null, b: Date | null): boolean {
    if (!a || !b) return false;
    return (
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate()
    );
  }

  function isInRange(d: Date): boolean {
    if (!selectedFrom || !selectedTo) return false;
    return d >= selectedFrom && d <= selectedTo;
  }

  function isCurrentMonth(d: Date): boolean {
    return d.getMonth() === month && d.getFullYear() === year;
  }

  const today = new Date();

  return (
    <div className="grid grid-cols-7 gap-0.5 text-center">
      {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
        <div key={day} className="text-[11px] font-medium text-gray-500 py-1">
          {day.charAt(0)}
        </div>
      ))}
      {weeks.flat().map((date) => {
        if (!date) return null;
        const isFrom = isSameDay(date, selectedFrom);
        const isTo = isSameDay(date, selectedTo);
        const inRange = isInRange(date);
        const isToday = isSameDay(date, today);
        const inMonth = isCurrentMonth(date);

        return (
          <button
            key={`${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`}
            type="button"
            onClick={() => onSelectDate(date)}
            className={`
              w-8 h-8 text-sm rounded-md transition-colors
              ${!inMonth ? "text-gray-600" : "text-gray-300"}
              ${isFrom || isTo ? "bg-emerald-600 text-white font-medium" : ""}
              ${inRange && !isFrom && !isTo ? "bg-emerald-600/20 text-emerald-300" : ""}
              ${isToday && !isFrom && !isTo ? "ring-1 ring-emerald-500" : ""}
              ${inMonth && !isFrom && !isTo && !inRange ? "hover:bg-white/[0.08]" : ""}
            `}
          >
            {date.getDate()}
          </button>
        );
      })}
    </div>
  );
}

// ── Date Picker Popover ───────────────────────────────────────────────────────

function DatePickerPopover({
  from,
  to,
  onSelect,
  onClose,
}: {
  from: Date;
  to: Date;
  onSelect: (from: Date, to: Date) => void;
  onClose: () => void;
}) {
  const [calMonth, setCalMonth] = useState(to.getMonth());
  const [calYear, setCalYear] = useState(to.getFullYear());
  const [selFrom, setSelFrom] = useState<Date | null>(from);
  const [selTo, setSelTo] = useState<Date | null>(to);
  const [selectingEnd, setSelectingEnd] = useState(false);
  const presets = useMemo(() => getDatePresets(), []);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  const monthName = new Date(calYear, calMonth).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  function prevMonth() {
    if (calMonth === 0) {
      setCalMonth(11);
      setCalYear(calYear - 1);
    } else {
      setCalMonth(calMonth - 1);
    }
  }

  function nextMonth() {
    if (calMonth === 11) {
      setCalMonth(0);
      setCalYear(calYear + 1);
    } else {
      setCalMonth(calMonth + 1);
    }
  }

  function handleSelectDate(d: Date) {
    if (!selectingEnd) {
      setSelFrom(d);
      setSelTo(null);
      setSelectingEnd(true);
    } else {
      const anchor = selFrom ?? d;
      const newFrom = d < anchor ? d : anchor;
      const newTo = d < anchor ? anchor : d;
      setSelFrom(newFrom);
      setSelTo(newTo);
      setSelectingEnd(false);
      onSelect(newFrom, newTo);
    }
  }

  function handlePreset(preset: (typeof presets)[0]) {
    const { from: pFrom, to: pTo } = preset.getRange();
    setSelFrom(pFrom);
    setSelTo(pTo);
    onSelect(pFrom, pTo);
  }

  return (
    <div
      ref={popoverRef}
      className="absolute right-0 top-full mt-2 z-50 flex bg-[#1a1a1a] border border-white/[0.08] rounded-xl shadow-2xl overflow-hidden"
    >
      {/* Presets */}
      <div className="w-40 border-r border-white/[0.08] py-2">
        {presets.map((preset) => (
          <button
            key={preset.key}
            type="button"
            onClick={() => handlePreset(preset)}
            className="w-full text-left px-4 py-1.5 text-sm text-gray-300 hover:bg-white/[0.06] hover:text-white transition-colors"
          >
            {preset.label}
          </button>
        ))}
      </div>
      {/* Calendar */}
      <div className="p-4 w-72">
        <div className="flex items-center justify-between mb-3">
          <button
            type="button"
            onClick={prevMonth}
            className="p-1 rounded hover:bg-white/[0.08] text-gray-400"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm font-medium text-white">{monthName}</span>
          <button
            type="button"
            onClick={nextMonth}
            className="p-1 rounded hover:bg-white/[0.08] text-gray-400"
          >
            <ChevronRight size={16} />
          </button>
        </div>
        <CalendarGrid
          month={calMonth}
          year={calYear}
          selectedFrom={selFrom}
          selectedTo={selTo}
          onSelectDate={handleSelectDate}
        />
      </div>
    </div>
  );
}

// ── Analytics Shell ───────────────────────────────────────────────────────────

interface TabBadgeCounts {
  [tabKey: string]: number;
}

export function AnalyticsShell({
  children,
  tabCounts,
}: {
  children: React.ReactNode;
  tabCounts?: TabBadgeCounts;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const trafficSource = parseTrafficSource(searchParams.get("trafficSource"));

  // Date range from URL or default to last 7 days
  const defaultPreset = getDatePresets()[2]; // "Last 7 days"
  const defaultRange = defaultPreset.getRange();
  const fromParam = parseDateParam(searchParams.get("from"));
  const toParam = parseDateParam(searchParams.get("to"));
  const dateFrom = fromParam ?? defaultRange.from;
  const dateTo = toParam ?? defaultRange.to;

  const [datePickerOpen, setDatePickerOpen] = useState(false);

  const tabs = getTabsForSource(trafficSource);

  const updateParams = useCallback(
    (updates: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [k, v] of Object.entries(updates)) {
        params.set(k, v);
      }
      router.push(`${pathname}?${params.toString()}`);
    },
    [router, pathname, searchParams],
  );

  function setTrafficSource(source: TrafficSource) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("trafficSource", source);
    // When switching traffic source, go to the base analytics page
    router.push(`/analytics?${params.toString()}`);
  }

  function handleDateSelect(from: Date, to: Date) {
    updateParams({
      from: from.toISOString().split("T")[0],
      to: to.toISOString().split("T")[0],
    });
    setDatePickerOpen(false);
  }

  function buildTabHref(href: string): string {
    const params = new URLSearchParams();
    if (trafficSource !== "human") {
      params.set("trafficSource", trafficSource);
    }
    const fromStr = searchParams.get("from");
    const toStr = searchParams.get("to");
    if (fromParam && fromStr) params.set("from", fromStr);
    if (toParam && toStr) params.set("to", toStr);
    const qs = params.toString();
    return qs ? `${href}?${qs}` : href;
  }

  function isTabActive(tabHref: string): boolean {
    if (tabHref === "/analytics") {
      return pathname === "/analytics";
    }
    return pathname.startsWith(tabHref);
  }

  return (
    <div className="px-8 py-6">
      {/* Header */}
      <h1 className="text-xl font-semibold text-white mb-5">Analytics</h1>

      {/* Controls row */}
      <div className="flex items-center justify-between mb-5">
        {/* Traffic source toggle */}
        <div className="flex bg-[#1a1a1a] rounded-lg p-0.5 border border-white/[0.08]">
          <button
            type="button"
            onClick={() => setTrafficSource("human")}
            data-active={trafficSource === "human"}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
              trafficSource === "human"
                ? "bg-white/[0.1] text-white"
                : "text-gray-400 hover:text-gray-200"
            }`}
          >
            Humans
          </button>
          <button
            type="button"
            onClick={() => setTrafficSource("agent")}
            data-active={trafficSource === "agent"}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
              trafficSource === "agent"
                ? "bg-white/[0.1] text-white"
                : "text-gray-400 hover:text-gray-200"
            }`}
          >
            Agents
          </button>
        </div>

        {/* Date range picker */}
        <div className="relative">
          <button
            type="button"
            data-testid="date-range-button"
            onClick={() => setDatePickerOpen(!datePickerOpen)}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-300 bg-[#1a1a1a] border border-white/[0.08] rounded-lg hover:bg-white/[0.06] transition-colors"
          >
            <Calendar size={14} />
            <span>{formatDateRange(dateFrom, dateTo)}</span>
          </button>
          {datePickerOpen && (
            <DatePickerPopover
              from={dateFrom}
              to={dateTo}
              onSelect={handleDateSelect}
              onClose={() => setDatePickerOpen(false)}
            />
          )}
        </div>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-1 border-b border-white/[0.08] mb-6">
        {tabs.map((tab) => {
          const active = isTabActive(tab.href);
          const count = tabCounts?.[tab.key];
          return (
            <Link
              key={tab.key}
              href={buildTabHref(tab.href)}
              className={`flex items-center gap-2 px-3 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
                active
                  ? "border-white text-white"
                  : "border-transparent text-gray-400 hover:text-gray-200 hover:border-white/20"
              }`}
            >
              {tab.label}
              {count !== undefined && (
                <span
                  className={`text-xs px-1.5 py-0.5 rounded-full ${
                    active
                      ? "bg-white/[0.12] text-white"
                      : "bg-white/[0.06] text-gray-500"
                  }`}
                >
                  {count}
                </span>
              )}
            </Link>
          );
        })}
      </div>

      {/* Tab content */}
      {children}
    </div>
  );
}
