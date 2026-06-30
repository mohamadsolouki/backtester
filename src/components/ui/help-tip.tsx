"use client";

import { useRef, useState, type ReactNode } from "react";
import { HelpCircle } from "lucide-react";
import { usePopover } from "@/lib/use-popover";

export function HelpTip({ content }: { content: ReactNode }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLSpanElement>(null);

  usePopover(rootRef, open, () => setOpen(false));

  return (
    <span ref={rootRef} className="relative inline-flex">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-label="Help"
        className="text-[var(--muted)] hover:text-[var(--teal-dark)]"
      >
        <HelpCircle className="h-3.5 w-3.5" />
      </button>
      {open && (
        <div className="absolute left-1/2 top-full z-50 mt-2 w-64 -translate-x-1/2 rounded-md border border-[var(--line)] bg-[var(--panel)] p-3 text-[12px] leading-relaxed text-[var(--ink)] shadow-soft">
          {content}
        </div>
      )}
    </span>
  );
}
