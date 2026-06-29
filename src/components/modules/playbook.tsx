"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Plus, Check } from "lucide-react";
import { Surface, SectionTitle, ModuleShell, ActionButton, TextField, EmptyState } from "@/components/ui";
import { cn } from "@/lib/utils";
import { createPlaybook, updatePlaybook, deletePlaybook } from "@/app/actions/playbooks";

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
  const [selectedId, setSelectedId] = useState<string | null>(playbooks[0]?.id ?? null);
  const [showForm, setShowForm] = useState(false);
  const selected = playbooks.find((p) => p.id === selectedId) ?? playbooks[0] ?? null;

  return (
    <ModuleShell
      title="Playbook"
      description="Setup library with conditions, entry logic, and exit rules."
      actions={<ActionButton icon={Plus} onClick={() => setShowForm(true)}>Add Setup</ActionButton>}
    >
      {showForm && <PlaybookForm onClose={() => setShowForm(false)} />}

      <div className="grid grid-cols-[300px_1fr] gap-2 max-[980px]:grid-cols-1">
        <Surface>
          <SectionTitle>Setup Library</SectionTitle>
          {playbooks.length === 0 ? (
            <p className="mt-3 text-[13px] text-[#66746f]">No playbooks yet. Create your first setup.</p>
          ) : (
            <div className="mt-3 space-y-2">
              {playbooks.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setSelectedId(p.id)}
                  className={cn(
                    "w-full rounded-md border p-3 text-left text-[13px] hover:bg-[#f5faf8]",
                    p.id === selectedId ? "border-[#89ccc6] bg-[#effaf8]" : "border-[#dbe2df]"
                  )}
                >
                  <div className="font-semibold">{p.name}</div>
                  <div className="mt-1 line-clamp-2 text-[12px] text-[#66746f]">{p.context}</div>
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
  const [pending, startTransition] = useTransition();

  function handleDelete() {
    if (!confirm("Delete this playbook?")) return;
    startTransition(async () => {
      await deletePlaybook(playbook.id);
      toast.success("Playbook deleted");
    });
  }

  return (
    <Surface>
      <div className="flex items-center justify-between">
        <SectionTitle>{playbook.name}</SectionTitle>
        <button onClick={handleDelete} disabled={pending} className="text-[12px] text-[#d94848] hover:underline">Delete</button>
      </div>
      <p className="mt-2 text-[13px] text-[#66746f]">{playbook.context}</p>

      <div className="mt-4 grid grid-cols-2 gap-4 max-[768px]:grid-cols-1">
        <div>
          <h3 className="text-[12px] font-semibold uppercase text-[#08746f]">Valid Conditions</h3>
          <div className="mt-2 space-y-2">
            {playbook.validConditions.map((c) => (
              <div key={c} className="flex items-center gap-2 text-[12px]">
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#4f9a39] text-white">
                  <Check className="h-3 w-3" />
                </span>
                {c}
              </div>
            ))}
          </div>
        </div>
        <div>
          <h3 className="text-[12px] font-semibold uppercase text-[#d94848]">Invalid Conditions</h3>
          <div className="mt-2 space-y-2">
            {playbook.invalidConditions.map((c) => (
              <div key={c} className="flex items-center gap-2 text-[12px]">
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#d94848] text-white">
                  <Check className="h-3 w-3" />
                </span>
                {c}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4 max-[768px]:grid-cols-1">
        <div className="rounded-md border border-[#dbe2df] bg-[#fbfcfa] p-3">
          <h3 className="text-[12px] font-semibold uppercase">Entry Logic</h3>
          <p className="mt-2 whitespace-pre-line text-[12px] text-[#34413d]">{playbook.entryLogic}</p>
        </div>
        <div className="rounded-md border border-[#dbe2df] bg-[#fbfcfa] p-3">
          <h3 className="text-[12px] font-semibold uppercase">Exit Logic</h3>
          <p className="mt-2 whitespace-pre-line text-[12px] text-[#34413d]">{playbook.exitLogic}</p>
        </div>
      </div>

      {playbook.notes && (
        <div className="mt-4 rounded-md bg-[#f5f7f4] p-3">
          <h3 className="text-[12px] font-semibold">Notes</h3>
          <p className="mt-1 text-[13px] text-[#34413d]">{playbook.notes}</p>
        </div>
      )}
    </Surface>
  );
}

function PlaybookForm({ onClose }: { onClose: () => void }) {
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [context, setContext] = useState("");
  const [validStr, setValidStr] = useState("");
  const [invalidStr, setInvalidStr] = useState("");
  const [entryLogic, setEntryLogic] = useState("");
  const [exitLogic, setExitLogic] = useState("");
  const [notes, setNotes] = useState("");

  function handleSubmit() {
    if (!name || !context) { toast.error("Name and context are required"); return; }
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
      toast.success("Playbook created");
      onClose();
    });
  }

  return (
    <Surface>
      <div className="flex items-center justify-between">
        <SectionTitle>New Playbook Setup</SectionTitle>
        <button onClick={onClose} className="text-[12px] text-[#66746f]">Cancel</button>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3 max-[768px]:grid-cols-1">
        <TextField label="Name" value={name} onChange={setName} required />
        <TextField label="Context" value={context} onChange={setContext} required />
        <label className="col-span-1">
          <span className="text-[12px] text-[#66746f]">Valid Conditions (one per line)</span>
          <textarea value={validStr} onChange={(e) => setValidStr(e.target.value)} className="mt-1 min-h-20 w-full rounded-md border border-[#cfd8d4] p-3 text-[13px]" />
        </label>
        <label className="col-span-1">
          <span className="text-[12px] text-[#66746f]">Invalid Conditions (one per line)</span>
          <textarea value={invalidStr} onChange={(e) => setInvalidStr(e.target.value)} className="mt-1 min-h-20 w-full rounded-md border border-[#cfd8d4] p-3 text-[13px]" />
        </label>
        <label className="col-span-1">
          <span className="text-[12px] text-[#66746f]">Entry Logic</span>
          <textarea value={entryLogic} onChange={(e) => setEntryLogic(e.target.value)} className="mt-1 min-h-20 w-full rounded-md border border-[#cfd8d4] p-3 text-[13px]" />
        </label>
        <label className="col-span-1">
          <span className="text-[12px] text-[#66746f]">Exit Logic</span>
          <textarea value={exitLogic} onChange={(e) => setExitLogic(e.target.value)} className="mt-1 min-h-20 w-full rounded-md border border-[#cfd8d4] p-3 text-[13px]" />
        </label>
        <label className="col-span-2 max-[768px]:col-span-1">
          <span className="text-[12px] text-[#66746f]">Notes</span>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="mt-1 min-h-16 w-full rounded-md border border-[#cfd8d4] p-3 text-[13px]" />
        </label>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <button onClick={onClose} className="h-9 rounded-md border border-[#cfd8d4] px-4 text-[12px] font-semibold">Cancel</button>
        <button onClick={handleSubmit} disabled={pending} className="h-9 rounded-md bg-[#0f9f95] px-6 text-[12px] font-semibold text-white disabled:opacity-50">
          {pending ? "Creating..." : "Create"}
        </button>
      </div>
    </Surface>
  );
}
