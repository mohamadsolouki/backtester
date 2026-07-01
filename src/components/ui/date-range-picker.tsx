"use client";

import { useRef, useState } from "react";
import { format } from "date-fns";
import { DayPicker, type DateRange } from "react-day-picker";
import { CalendarDays } from "lucide-react";
import "react-day-picker/style.css";
import { cn } from "@/lib/utils";
import { usePopover } from "@/lib/use-popover";
import {
  DATE_RANGE_PRESETS,
  formatDateRangeLabel,
  resolvePreset,
  type DateRangePreset,
  type ResolvedDateRange,
} from "@/lib/date-range";

export function DateRangePicker({
  preset,
  range,
  onChange,
}: {
  preset: DateRangePreset;
  range: ResolvedDateRange;
  onChange: (preset: DateRangePreset, range: ResolvedDateRange) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  usePopover(rootRef, open, () => setOpen(false));

  function selectPreset(next: DateRangePreset) {
    onChange(next, resolvePreset(next));
    setOpen(false);
  }

  function selectCustomRange(next: DateRange | undefined) {
    onChange("custom", { from: next?.from, to: next?.to });
  }

  const label = formatDateRangeLabel(preset, range, format);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="mt-1.5 flex h-8 items-center gap-2 rounded-md border border-white/12 bg-white/6 px-3 text-[13px] text-white transition-colors hover:border-white/24 hover:bg-white/10"
      >
        {label}
        <CalendarDays className="h-3.5 w-3.5 text-white/64" />
      </button>
      {open && (
        <div className="animate-scale-in absolute left-0 z-50 mt-2 flex origin-top-left overflow-hidden rounded-lg border border-[var(--line)] bg-[var(--panel)] text-[var(--ink)] shadow-soft max-[640px]:flex-col">
          <div className="flex flex-col gap-1 border-r border-[var(--line)] p-2 max-[640px]:border-b max-[640px]:border-r-0">
            {DATE_RANGE_PRESETS.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => selectPreset(item.value)}
                className={cn(
                  "rounded-md px-3 py-1.5 text-left text-[12px] whitespace-nowrap hover:bg-[var(--panel-soft)]",
                  preset === item.value && "bg-[var(--panel-soft)] font-semibold text-[var(--teal-dark)]"
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
          <div className="p-2 [--rdp-accent-color:var(--teal)] [--rdp-accent-background-color:var(--panel-soft)]">
            <DayPicker
              mode="range"
              numberOfMonths={1}
              selected={{ from: range.from, to: range.to }}
              onSelect={selectCustomRange}
            />
          </div>
        </div>
      )}
    </div>
  );
}
