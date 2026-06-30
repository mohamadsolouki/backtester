"use client";

import { useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePopover } from "@/lib/use-popover";

export function Combobox({
  label,
  value,
  onChange,
  options,
  onCreate,
  placeholder,
  required,
  creatable = true,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  onCreate?: (value: string) => void | Promise<void>;
  placeholder?: string;
  required?: boolean;
  creatable?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value);
  const [pending, setPending] = useState(false);
  const [prevValue, setPrevValue] = useState(value);
  const rootRef = useRef<HTMLDivElement>(null);

  usePopover(rootRef, open, () => setOpen(false));

  // Keep the local query in sync when the parent resets `value` externally (e.g. form submit clears it).
  if (value !== prevValue) {
    setPrevValue(value);
    setQuery(value);
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((opt) => opt.toLowerCase().includes(q));
  }, [options, query]);

  const exactMatch = options.some((opt) => opt.toLowerCase() === query.trim().toLowerCase());
  const showCreate = creatable && query.trim().length > 0 && !exactMatch;

  function select(next: string) {
    onChange(next);
    setQuery(next);
    setOpen(false);
  }

  async function handleCreate() {
    const next = query.trim();
    if (!next) return;
    setPending(true);
    try {
      await onCreate?.(next);
      select(next);
    } finally {
      setPending(false);
    }
  }

  return (
    <div ref={rootRef} className="relative">
      <label>
        <span className="text-[12px] text-[var(--muted)]">{label}</span>
        <div className="relative mt-1">
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => onChange(query)}
            placeholder={placeholder}
            required={required}
            className="h-9 w-full rounded-md border border-[var(--line)] bg-[var(--panel)] px-3 pr-8 text-[var(--ink)] outline-none focus:border-[var(--teal)]"
          />
          <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--muted)]" />
        </div>
      </label>
      {open && (filtered.length > 0 || showCreate) && (
        <div className="thin-scrollbar absolute z-50 mt-1 max-h-56 w-full overflow-auto rounded-md border border-[var(--line)] bg-[var(--panel)] shadow-soft">
          {filtered.map((opt) => (
            <button
              key={opt}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => select(opt)}
              className={cn(
                "flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-[13px] hover:bg-[var(--panel-soft)]",
                opt === value && "text-[var(--teal-dark)]"
              )}
            >
              {opt}
              {opt === value && <Check className="h-3.5 w-3.5" />}
            </button>
          ))}
          {showCreate && (
            <button
              type="button"
              disabled={pending}
              onMouseDown={(e) => e.preventDefault()}
              onClick={handleCreate}
              className="flex w-full items-center gap-2 border-t border-[var(--line)] px-3 py-2 text-left text-[13px] font-medium text-[var(--teal-dark)] hover:bg-[var(--panel-soft)] disabled:opacity-50"
            >
              <Plus className="h-3.5 w-3.5" />
              {pending ? "Adding…" : `Add "${query.trim()}"`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
