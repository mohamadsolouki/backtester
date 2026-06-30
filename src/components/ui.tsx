"use client";

import type { ReactNode } from "react";
import { Check, SlidersHorizontal, Upload } from "lucide-react";
import { cn } from "@/lib/utils";
import { gradeTone } from "@/lib/context-engine";
import type { Grade } from "@/lib/domain";

export function Surface({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-md border border-[#dbe2df] bg-white p-3 shadow-soft", className)}>
      {children}
    </section>
  );
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return <h2 className="text-[14px] font-semibold uppercase tracking-[0.02em]">{children}</h2>;
}

export function ModuleShell({
  title,
  description,
  actions,
  children,
}: {
  title: string;
  description: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-[#dbe2df] bg-white p-4 shadow-soft">
        <div>
          <h1 className="text-[20px] font-semibold tracking-[-0.01em]">{title}</h1>
          <p className="mt-1 max-w-3xl text-[13px] text-[#66746f]">{description}</p>
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
      {children}
    </div>
  );
}

export function ActionButton({
  icon: Icon,
  onClick,
  children,
  type,
  disabled,
}: {
  icon: typeof Upload;
  onClick?: () => void;
  children: ReactNode;
  type?: "button" | "submit";
  disabled?: boolean;
}) {
  return (
    <button
      type={type ?? "button"}
      onClick={onClick}
      disabled={disabled}
      className="flex h-9 items-center gap-2 rounded-md border border-[#b7d5d2] bg-white px-3 text-[12px] font-semibold text-[#08746f] hover:bg-[#effaf8] disabled:opacity-50"
    >
      <Icon className="h-3.5 w-3.5" />
      {children}
    </button>
  );
}

export function StatusPill({ status, label }: { status: string; label?: string }) {
  const styles: Record<string, string> = {
    TAKEN: "border-[#89ccc6] bg-[#effaf8] text-[#08746f]",
    Taken: "border-[#89ccc6] bg-[#effaf8] text-[#08746f]",
    SKIPPED: "border-[#edc474] bg-[#fff7e8] text-[#b86e04]",
    Skipped: "border-[#edc474] bg-[#fff7e8] text-[#b86e04]",
    NOT_FORMED: "border-[#cfd8d4] bg-[#f4f6f5] text-[#66746f]",
    "Not Formed": "border-[#cfd8d4] bg-[#f4f6f5] text-[#66746f]",
    WATCHING: "border-[#b8c9f3] bg-[#eef3ff] text-[#435da8]",
    Watching: "border-[#b8c9f3] bg-[#eef3ff] text-[#435da8]",
    PLANNED: "border-[#b8c9f3] bg-[#eef3ff] text-[#435da8]",
    OPEN: "border-[#b8c9f3] bg-[#eef3ff] text-[#435da8]",
    CLOSED: "border-[#89ccc6] bg-[#effaf8] text-[#08746f]",
    SCRATCH: "border-[#cfd8d4] bg-[#f4f6f5] text-[#66746f]",
  };
  const displayLabel = label ?? status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  return (
    <span className={cn("rounded border px-2 py-1 text-[11px] font-medium", styles[status] ?? styles.WATCHING)}>
      {displayLabel}
    </span>
  );
}

export function GradeBadge({ grade }: { grade: string }) {
  return (
    <span className={cn("rounded border px-2 py-1 text-[12px] font-semibold", gradeTone(grade as Grade))}>
      {grade}
    </span>
  );
}

export function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <Surface>
      <div className="text-[12px] text-[#66746f]">{label}</div>
      <div className="mt-1 text-[22px] font-semibold tracking-[-0.02em]">{value}</div>
    </Surface>
  );
}

export function Segmented({
  value,
  options,
  onChange,
}: {
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex h-8 overflow-hidden rounded-md border border-[#cfd8d4]">
      {options.map((option) => (
        <button
          key={option}
          onClick={() => onChange(option)}
          className={cn(
            "px-3 text-[12px] font-medium",
            value === option
              ? "bg-[#0f9f95] text-white"
              : "bg-white text-[#263331] hover:bg-[#f0f4f1]"
          )}
        >
          {option}
        </button>
      ))}
    </div>
  );
}

export function KeyValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[135px_1fr] text-[13px]">
      <span className="text-[#44524d]">{label}</span>
      <span className="font-medium text-[#263331]">{value}</span>
    </div>
  );
}

export function Checkbox({ checked }: { checked: boolean }) {
  return (
    <span
      className={cn(
        "flex h-4 w-4 shrink-0 items-center justify-center rounded border",
        checked ? "border-[#0f9f95] bg-[#0f9f95] text-white" : "border-[#98a5a0] bg-white"
      )}
    >
      {checked && <Check className="h-3 w-3" />}
    </span>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex min-h-56 flex-col items-center justify-center rounded-md border border-dashed border-[#cfd8d4] p-8 text-center">
      <SlidersHorizontal className="h-8 w-8 text-[#0f9f95]" />
      <div className="mt-3 font-semibold">{title}</div>
      <p className="mt-1 max-w-md text-[13px] text-[#66746f]">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function TextField({
  label,
  value,
  onChange,
  placeholder,
  required,
  type,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  type?: string;
}) {
  return (
    <label>
      <span className="text-[12px] text-[#66746f]">{label}</span>
      <input
        type={type ?? "text"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className="mt-1 h-9 w-full rounded-md border border-[#cfd8d4] bg-white px-3 outline-none focus:border-[#0f9f95]"
      />
    </label>
  );
}

export function NumberField({
  label,
  value,
  onChange,
  step,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  step?: string;
}) {
  return (
    <label>
      <span className="text-[12px] text-[#66746f]">{label}</span>
      <input
        type="number"
        value={value}
        step={step}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-1 h-9 w-full rounded-md border border-[#cfd8d4] bg-white px-3 outline-none focus:border-[#0f9f95]"
      />
    </label>
  );
}

export function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1">
      <span className={cn("h-2 w-2 rounded-full", color)} />
      {label}
    </span>
  );
}
