"use client";

import type { ReactNode } from "react";
import { HelpTip } from "./help-tip";

export function FormField({
  label,
  help,
  error,
  children,
}: {
  label: string;
  help?: ReactNode;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-1.5">
        <span className="text-[12px] text-[var(--muted)]">{label}</span>
        {help && <HelpTip content={help} />}
      </div>
      <div className="mt-1">{children}</div>
      {error && <p className="mt-1 text-[11px] text-[var(--red)]">{error}</p>}
    </div>
  );
}
