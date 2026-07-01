"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Plus, Check } from "lucide-react";
import { Surface, SectionTitle, ModuleShell, ActionButton, TextField, EmptyState } from "@/components/ui";
import { cn } from "@/lib/utils";
import { createPlaybook, updatePlaybook, deletePlaybook } from "@/app/actions/playbooks";
import { useI18n } from "@/components/layout/i18n-provider";

type SerializedPlaybook = {
  id: string;
  name: string;
  context: string;
  active: boolean;
  validConditions: string[];
  invalidConditions: string[];
  entryLogic: string;
  exitLogic: string;
  notes: string | null;
};

export function PlaybookView({ playbooks }: { playbooks: SerializedPlaybook[] }) {
  const { t } = useI18n();
  const [selectedId, setSelectedId] = useState<string | null>(playbooks[0]?.id ?? null);
  const [showForm, setShowForm] = useState(false);
  const selected = playbooks.find((p) => p.id === selectedId) ?? playbooks[0] ?? null;

  return (
    <ModuleShell
      title={t("Playbook")}
      eyebrow={t("Plan")}
      description={t("Setup library with conditions, entry logic, and exit rules.")}
      actions={<ActionButton icon={Plus} onClick={() => setShowForm(true)}>{t("Add Setup")}</ActionButton>}
    >
      {showForm && <PlaybookForm onClose={() => setShowForm(false)} />}

      <div className="grid grid-cols-[300px_1fr] gap-2 max-[980px]:grid-cols-1">
        <Surface>
          <SectionTitle>{t("Setup Library")}</SectionTitle>
          {playbooks.length === 0 ? (
            <EmptyState title={t("No playbooks yet")} description={t("Create your first setup to start tracking entry/exit rules.")} />
          ) : (
            <div className="mt-3 space-y-2">
              {playbooks.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setSelectedId(p.id)}
                  className={cn(
                    "shadow-lift w-full rounded-md border p-3 text-start text-[13px] hover:bg-[var(--panel-soft)]",
                    p.id === selectedId
                      ? "border-[var(--teal)]/50 bg-[var(--panel-soft)]"
                      : "border-[var(--line)]"
                  )}
                >
                  <div className="font-semibold">{p.name}</div>
                  <div className="mt-1 line-clamp-2 text-[12px] text-[var(--muted)]">{p.context}</div>
                </button>
              ))}
            </div>
          )}
        </Surface>

        {selected && <PlaybookDetail playbook={selected} />}
      </div>
    </ModuleShell>
  );
}

function PlaybookDetail({ playbook }: { playbook: SerializedPlaybook }) {
  const { t } = useI18n();
  const [pending, startTransition] = useTransition();

  function handleDelete() {
    if (!confirm(t("Delete this playbook?"))) return;
    startTransition(async () => {
      await deletePlaybook(playbook.id);
      toast.success(t("Playbook deleted"));
    });
  }

  function toggleActive() {
    startTransition(async () => {
      await updatePlaybook(playbook.id, { active: !playbook.active });
      toast.success(t(playbook.active ? "Setup deactivated" : "Setup activated"));
    });
  }

  return (
    <Surface>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <SectionTitle>{playbook.name}</SectionTitle>
          <span className={cn(
            "rounded border px-2 py-0.5 text-[11px] font-medium",
            playbook.active
              ? "border-[var(--teal)]/40 bg-[var(--panel-soft)] text-[var(--teal-dark)]"
              : "border-[var(--line)] bg-[var(--panel-soft)] text-[var(--muted)]"
          )}>
            {playbook.active ? t("Active") : t("Inactive")}
          </span>
        </div>
        <div className="flex gap-3">
          <button onClick={toggleActive} disabled={pending} className="text-[12px] text-[var(--teal-dark)] hover:underline">
            {playbook.active ? t("Deactivate") : t("Activate")}
          </button>
          <button onClick={handleDelete} disabled={pending} className="text-[12px] text-[var(--red)] hover:underline">{t("Delete")}</button>
        </div>
      </div>
      <p className="mt-2 text-[13px] text-[var(--muted)]">{playbook.context}</p>

      <div className="mt-4 grid grid-cols-2 gap-4 max-[768px]:grid-cols-1">
        <div>
          <h3 className="text-[12px] font-semibold uppercase text-[var(--teal-dark)]">{t("Valid Conditions")}</h3>
          <div className="mt-2 space-y-2">
            {playbook.validConditions.map((c) => (
              <div key={c} className="flex items-center gap-2 text-[12px]">
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[var(--teal)] text-white">
                  <Check className="h-3 w-3" />
                </span>
                {c}
              </div>
            ))}
          </div>
        </div>
        <div>
          <h3 className="text-[12px] font-semibold uppercase text-[var(--red)]">{t("Invalid Conditions")}</h3>
          <div className="mt-2 space-y-2">
            {playbook.invalidConditions.map((c) => (
              <div key={c} className="flex items-center gap-2 text-[12px]">
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[var(--red)] text-white">
                  <Check className="h-3 w-3" />
                </span>
                {c}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4 max-[768px]:grid-cols-1">
        <div className="rounded-md border border-[var(--line)] bg-[var(--panel-soft)] p-3">
          <h3 className="text-[12px] font-semibold uppercase">{t("Entry Logic")}</h3>
          <p className="mt-2 whitespace-pre-line text-[12px] text-[var(--ink)]">{playbook.entryLogic}</p>
        </div>
        <div className="rounded-md border border-[var(--line)] bg-[var(--panel-soft)] p-3">
          <h3 className="text-[12px] font-semibold uppercase">{t("Exit Logic")}</h3>
          <p className="mt-2 whitespace-pre-line text-[12px] text-[var(--ink)]">{playbook.exitLogic}</p>
        </div>
      </div>

      {playbook.notes && (
        <div className="mt-4 rounded-md bg-[var(--panel-soft)] p-3">
          <h3 className="text-[12px] font-semibold">{t("Notes")}</h3>
          <p className="mt-1 text-[13px] text-[var(--ink)]">{playbook.notes}</p>
        </div>
      )}
    </Surface>
  );
}

function PlaybookForm({ onClose }: { onClose: () => void }) {
  const { t } = useI18n();
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [context, setContext] = useState("");
  const [validStr, setValidStr] = useState("");
  const [invalidStr, setInvalidStr] = useState("");
  const [entryLogic, setEntryLogic] = useState("");
  const [exitLogic, setExitLogic] = useState("");
  const [notes, setNotes] = useState("");

  function handleSubmit() {
    if (!name || !context) { toast.error(t("Name and context are required")); return; }
    startTransition(async () => {
      await createPlaybook({
        name,
        context,
        validConditions: validStr.split("\n").filter(Boolean),
        invalidConditions: invalidStr.split("\n").filter(Boolean),
        entryLogic,
        exitLogic,
        notes: notes || undefined,
      });
      toast.success(t("Playbook created"));
      onClose();
    });
  }

  const textareaClass = "mt-1 min-h-20 w-full rounded-md border border-[var(--line)] bg-[var(--panel)] p-3 text-[13px] text-[var(--ink)] outline-none focus:border-[var(--teal)]";
  const labelClass = "text-[12px] text-[var(--muted)]";

  return (
    <Surface>
      <div className="flex items-center justify-between">
        <SectionTitle>{t("New Playbook Setup")}</SectionTitle>
        <button onClick={onClose} className="text-[12px] text-[var(--muted)]">{t("Cancel")}</button>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3 max-[768px]:grid-cols-1">
        <TextField label={t("Name")} value={name} onChange={setName} required />
        <TextField label={t("Context")} value={context} onChange={setContext} required />
        <label className="col-span-1">
          <span className={labelClass}>{t("Valid Conditions (one per line)")}</span>
          <textarea value={validStr} onChange={(e) => setValidStr(e.target.value)} className={textareaClass} />
        </label>
        <label className="col-span-1">
          <span className={labelClass}>{t("Invalid Conditions (one per line)")}</span>
          <textarea value={invalidStr} onChange={(e) => setInvalidStr(e.target.value)} className={textareaClass} />
        </label>
        <label className="col-span-1">
          <span className={labelClass}>{t("Entry Logic")}</span>
          <textarea value={entryLogic} onChange={(e) => setEntryLogic(e.target.value)} className={textareaClass} />
        </label>
        <label className="col-span-1">
          <span className={labelClass}>{t("Exit Logic")}</span>
          <textarea value={exitLogic} onChange={(e) => setExitLogic(e.target.value)} className={textareaClass} />
        </label>
        <label className="col-span-2 max-[768px]:col-span-1">
          <span className={labelClass}>{t("Notes")}</span>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="mt-1 min-h-16 w-full rounded-md border border-[var(--line)] bg-[var(--panel)] p-3 text-[13px] text-[var(--ink)] outline-none focus:border-[var(--teal)]" />
        </label>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <button onClick={onClose} className="h-9 rounded-md border border-[var(--line)] px-4 text-[12px] font-semibold">{t("Cancel")}</button>
        <button onClick={handleSubmit} disabled={pending} className="h-9 rounded-md bg-[var(--teal)] px-6 text-[12px] font-semibold text-white disabled:opacity-50">
          {pending ? t("Creating...") : t("Create")}
        </button>
      </div>
    </Surface>
  );
}
