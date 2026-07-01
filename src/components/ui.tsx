"use client";

import React, { type ReactNode } from "react";
import { Check, SlidersHorizontal, Upload } from "lucide-react";
import { cn } from "@/lib/utils";
import { gradeTone } from "@/lib/context-engine";
import type { Grade } from "@/lib/domain";
import { useI18n } from "@/components/layout/i18n-provider";

export function Surface({
  children,
  className,
  interactive,
}: {
  children: ReactNode;
  className?: string;
  interactive?: boolean;
}) {
  return (
    <section
      className={cn(
        "rounded-lg border border-[var(--line)] bg-[var(--panel)] p-3 text-[var(--ink)] shadow-soft",
        interactive && "shadow-lift cursor-pointer",
        className
      )}
    >
      {children}
    </section>
  );
}

export function SectionTitle({ children, eyebrow }: { children: ReactNode; eyebrow?: string }) {
  return (
    <div className="flex items-baseline gap-2">
      {eyebrow && <span className="eyebrow text-[var(--teal-dark)]">{eyebrow}</span>}
      <h2 className="relative ps-2.5 text-[13px] font-semibold uppercase tracking-[0.04em] before:absolute before:start-0 before:top-[3px] before:h-[11px] before:w-[2.5px] before:rounded-full before:bg-[var(--teal)] before:content-['']">
        {children}
      </h2>
    </div>
  );
}

export function ModuleShell({
  title,
  description,
  eyebrow,
  actions,
  children,
}: {
  title: string;
  description: string;
  eyebrow?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="animate-fade-up space-y-2.5">
      <div className="relative flex flex-wrap items-center justify-between gap-3 overflow-hidden rounded-lg border border-[var(--line)] bg-[var(--panel)] p-5 text-[var(--ink)] shadow-soft">
        <div className="absolute inset-y-0 start-0 w-[3px] bg-gradient-to-b from-[var(--teal)] to-[var(--teal-dark)]" />
        <div>
          {eyebrow && <div className="eyebrow mb-1.5 text-[var(--teal-dark)]">{eyebrow}</div>}
          <h1 className="font-display text-[26px] font-semibold tracking-[-0.01em] text-[var(--ink)]">{title}</h1>
          <p className="mt-1.5 max-w-3xl text-[13px] leading-relaxed text-[var(--muted)]">{description}</p>
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
      className="flex h-9 items-center gap-2 rounded-md border border-[var(--teal)]/40 bg-[var(--panel)] px-3 text-[12px] font-semibold text-[var(--teal-dark)] transition-all hover:border-[var(--teal)]/70 hover:bg-[var(--teal-soft)] active:scale-[0.97] disabled:opacity-50 disabled:active:scale-100"
    >
      <Icon className="h-3.5 w-3.5" />
      {children}
    </button>
  );
}

export function PrimaryButton({
  onClick,
  children,
  type,
  disabled,
}: {
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
      className="h-9 rounded-md bg-[var(--teal)] px-5 text-[12px] font-semibold text-white shadow-[0_1px_2px_rgba(0,0,0,0.08)] transition-all hover:bg-[var(--teal-dark)] active:scale-[0.97] disabled:opacity-50 disabled:active:scale-100"
    >
      {children}
    </button>
  );
}

const PILL_STYLES: Record<string, string> = {
  TAKEN: "border-[var(--teal)]/35 bg-[var(--teal-soft)] text-[var(--teal-dark)]",
  Taken: "border-[var(--teal)]/35 bg-[var(--teal-soft)] text-[var(--teal-dark)]",
  SKIPPED: "border-[var(--amber)]/35 bg-[var(--amber)]/10 text-[var(--amber)]",
  Skipped: "border-[var(--amber)]/35 bg-[var(--amber)]/10 text-[var(--amber)]",
  NOT_FORMED: "border-[var(--line)] bg-[var(--panel-soft)] text-[var(--muted)]",
  "Not Formed": "border-[var(--line)] bg-[var(--panel-soft)] text-[var(--muted)]",
  WATCHING: "border-[#8fa6e6]/40 bg-[#8fa6e6]/12 text-[#435da8]",
  Watching: "border-[#8fa6e6]/40 bg-[#8fa6e6]/12 text-[#435da8]",
  PLANNED: "border-[#8fa6e6]/40 bg-[#8fa6e6]/12 text-[#435da8]",
  OPEN: "border-[#8fa6e6]/40 bg-[#8fa6e6]/12 text-[#435da8]",
  CLOSED: "border-[var(--teal)]/35 bg-[var(--teal-soft)] text-[var(--teal-dark)]",
  SCRATCH: "border-[var(--line)] bg-[var(--panel-soft)] text-[var(--muted)]",
};

const DOT_STYLES: Record<string, string> = {
  TAKEN: "bg-[var(--teal)]",
  Taken: "bg-[var(--teal)]",
  SKIPPED: "bg-[var(--amber)]",
  Skipped: "bg-[var(--amber)]",
  NOT_FORMED: "bg-[var(--muted)]",
  "Not Formed": "bg-[var(--muted)]",
  WATCHING: "bg-[#435da8]",
  Watching: "bg-[#435da8]",
  PLANNED: "bg-[#435da8]",
  OPEN: "bg-[#435da8]",
  CLOSED: "bg-[var(--teal)]",
  SCRATCH: "bg-[var(--muted)]",
};

export function StatusPill({ status, label }: { status: string; label?: string }) {
  const { t } = useI18n();
  const displayLabel = t(label ?? status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()));
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-[3px] text-[11px] font-medium",
        PILL_STYLES[status] ?? PILL_STYLES.WATCHING
      )}
    >
      <span className={cn("h-[5px] w-[5px] shrink-0 rounded-full", DOT_STYLES[status] ?? DOT_STYLES.WATCHING)} />
      {displayLabel}
    </span>
  );
}

export function GradeBadge({ grade }: { grade: string }) {
  return (
    <span className={cn("num rounded-md border px-2 py-1 text-[12px] font-semibold", gradeTone(grade as Grade))}>
      {grade}
    </span>
  );
}

export function Kpi({ label, value, accent }: { label: string; value: string; accent?: "up" | "down" | "neutral" }) {
  const accentColor =
    accent === "up" ? "var(--teal)" : accent === "down" ? "var(--red)" : "var(--line)";
  return (
    <Surface className="relative overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-[2.5px]" style={{ background: accentColor }} />
      <div className="eyebrow text-[var(--muted)]">{label}</div>
      <div className="num mt-1.5 text-[24px] font-semibold tracking-[-0.02em] text-[var(--ink)]">{value}</div>
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
  const { t } = useI18n();
  return (
    <div className="flex h-8 overflow-hidden rounded-md border border-[var(--line)] bg-[var(--panel-soft)] p-0.5">
      {options.map((option) => (
        <button
          key={option}
          onClick={() => onChange(option)}
          className={cn(
            "rounded px-3 text-[12px] font-medium transition-all",
            value === option
              ? "bg-[var(--teal)] text-white shadow-sm"
              : "text-[var(--muted)] hover:text-[var(--ink)]"
          )}
        >
          {t(option)}
        </button>
      ))}
    </div>
  );
}

export function KeyValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[135px_1fr] text-[13px]">
      <span className="text-[var(--muted)]">{label}</span>
      <span className="num font-medium text-[var(--ink)]">{value}</span>
    </div>
  );
}

export function Checkbox({ checked }: { checked: boolean }) {
  return (
    <span
      className={cn(
        "flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors",
        checked ? "border-[var(--teal)] bg-[var(--teal)] text-white" : "border-[var(--line)] bg-[var(--panel)]"
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
    <div className="flex min-h-56 flex-col items-center justify-center rounded-lg border border-dashed border-[var(--line)] bg-[var(--panel-soft)]/40 p-8 text-center">
      <div className="flex h-11 w-11 items-center justify-center rounded-full border border-[var(--teal)]/30 bg-[var(--teal-soft)]">
        <SlidersHorizontal className="h-[18px] w-[18px] text-[var(--teal-dark)]" />
      </div>
      <div className="mt-3 font-display font-semibold text-[16px] text-[var(--ink)]">{title}</div>
      <p className="mt-1 max-w-md text-[13px] text-[var(--muted)]">{description}</p>
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
      <span className="eyebrow text-[var(--muted)]">{label}</span>
      <input
        type={type ?? "text"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className="mt-1.5 h-9 w-full rounded-md border border-[var(--line)] bg-[var(--panel)] px-3 text-[var(--ink)] outline-none transition-colors focus:border-[var(--teal)] focus:ring-2 focus:ring-[var(--teal-soft)]"
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
  label: React.ReactNode;
  value: number;
  onChange: (value: number) => void;
  step?: string;
}) {
  return (
    <label>
      <span className="eyebrow text-[var(--muted)]">{label}</span>
      <input
        type="number"
        value={value}
        step={step}
        onChange={(e) => onChange(Number(e.target.value))}
        className="num mt-1.5 h-9 w-full rounded-md border border-[var(--line)] bg-[var(--panel)] px-3 text-[var(--ink)] outline-none transition-colors focus:border-[var(--teal)] focus:ring-2 focus:ring-[var(--teal-soft)]"
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
