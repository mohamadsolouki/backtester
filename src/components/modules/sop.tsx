"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Surface, SectionTitle, ModuleShell, ActionButton, TextField, EmptyState, Checkbox } from "@/components/ui";
import { createSopDocument, publishSopVersion } from "@/app/actions/sop";

type SopGroup = { title: string; items: { label: string; checked: boolean }[] };

type SerializedDoc = {
  id: string;
  title: string;
  versions: { id: string; version: string; content: unknown; changeLog: string | null; publishedAt: string }[];
};

const defaultGroups: SopGroup[] = [
  {
    title: "Prepare",
    items: [
      { label: "Review overnight action", checked: false },
      { label: "Mark key levels", checked: false },
      { label: "Check economic calendar", checked: false },
      { label: "Plan high-quality setups", checked: false },
    ],
  },
  {
    title: "Execute",
    items: [
      { label: "Trade only playbook setups", checked: false },
      { label: "Follow E1/E2/E3 plan", checked: false },
      { label: "Manage risk per rules", checked: false },
      { label: "No overtrading", checked: false },
    ],
  },
  {
    title: "Review",
    items: [
      { label: "Log every trade", checked: false },
      { label: "Grade every opportunity", checked: false },
      { label: "Note lessons learned", checked: false },
    ],
  },
];

export function SopView({ documents }: { documents: SerializedDoc[] }) {
  const [pending, startTransition] = useTransition();
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState("Daily Trading SOP");
  const [groups, setGroups] = useState<SopGroup[]>(defaultGroups);

  function toggleItem(groupIndex: number, itemIndex: number) {
    setGroups((current) =>
      current.map((g, gi) =>
        gi !== groupIndex
          ? g
          : { ...g, items: g.items.map((it, ii) => (ii === itemIndex ? { ...it, checked: !it.checked } : it)) }
      )
    );
  }

  function handleCreate() {
    startTransition(async () => {
      await createSopDocument(title, { groups });
      toast.success("SOP created");
      setShowCreate(false);
    });
  }

  const totalChecked = groups.reduce((sum, g) => sum + g.items.filter((i) => i.checked).length, 0);
  const totalItems = groups.reduce((sum, g) => sum + g.items.length, 0);

  return (
    <ModuleShell
      title="SOP"
      description="Versioned standard operating procedures for daily trading discipline."
      actions={documents.length === 0 ? <ActionButton icon={Plus} onClick={() => setShowCreate(true)}>Create SOP</ActionButton> : undefined}
    >
      {documents.length === 0 && !showCreate && (
        <EmptyState
          title="No SOP yet"
          description="Create your first standard operating procedure checklist."
          action={<ActionButton icon={Plus} onClick={() => setShowCreate(true)}>Create SOP</ActionButton>}
        />
      )}

      {(showCreate || documents.length === 0) && (
        <Surface>
          <SectionTitle>{documents.length === 0 ? "Create SOP" : "New SOP"}</SectionTitle>
          <div className="mt-3">
            <TextField label="Title" value={title} onChange={setTitle} />
          </div>
          <div className="mt-4 grid grid-cols-3 gap-3 max-[768px]:grid-cols-1">
            {groups.map((group, gi) => (
              <div key={group.title} className="rounded-md border border-[#dbe2df] p-3">
                <div className="text-[12px] font-semibold uppercase">{group.title}</div>
                <div className="mt-2 space-y-2">
                  {group.items.map((item, ii) => (
                    <button key={item.label} onClick={() => toggleItem(gi, ii)} className="flex w-full items-center gap-2 text-left text-[12px]">
                      <Checkbox checked={item.checked} />
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-2 text-[12px] text-[#66746f]">{totalChecked} / {totalItems} completed today</div>
          <button onClick={handleCreate} disabled={pending} className="mt-4 h-9 w-full rounded-md bg-[#0f9f95] text-[12px] font-semibold text-white disabled:opacity-50">
            {pending ? "Saving..." : "Save SOP"}
          </button>
        </Surface>
      )}

      {documents.map((doc) => (
        <SopDocumentCard key={doc.id} doc={doc} />
      ))}
    </ModuleShell>
  );
}

function SopDocumentCard({ doc }: { doc: SerializedDoc }) {
  const [pending, startTransition] = useTransition();
  const initialGroups = ((doc.versions[0]?.content as { groups?: SopGroup[] })?.groups) ?? [];
  const [groups, setGroups] = useState<SopGroup[]>(initialGroups);
  const [dirty, setDirty] = useState(false);
  const [changeLog, setChangeLog] = useState("");

  function toggleItem(groupIndex: number, itemIndex: number) {
    setGroups((current) =>
      current.map((g, gi) =>
        gi !== groupIndex
          ? g
          : { ...g, items: g.items.map((it, ii) => (ii === itemIndex ? { ...it, checked: !it.checked } : it)) }
      )
    );
    setDirty(true);
  }

  function publish() {
    if (!changeLog) { toast.error("Add a changelog describing what changed"); return; }
    startTransition(async () => {
      await publishSopVersion(doc.id, { groups }, changeLog);
      toast.success("SOP version published");
      setDirty(false);
      setChangeLog("");
    });
  }

  const totalChecked = groups.reduce((sum, g) => sum + g.items.filter((i) => i.checked).length, 0);
  const totalItems = groups.reduce((sum, g) => sum + g.items.length, 0);

  return (
    <Surface>
      <div className="flex items-center justify-between">
        <SectionTitle>{doc.title}</SectionTitle>
        <span className="text-[12px] font-semibold text-[#08746f]">
          v{doc.versions[0]?.version ?? "1.0.0"} · {totalChecked}/{totalItems} today
        </span>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-3 max-[768px]:grid-cols-1">
        {groups.map((group, gi) => (
          <div key={group.title} className="rounded-md border border-[#dbe2df] p-3">
            <div className="text-[12px] font-semibold uppercase">{group.title}</div>
            <div className="mt-2 space-y-2">
              {group.items.map((item, ii) => (
                <button key={item.label} onClick={() => toggleItem(gi, ii)} className="flex w-full items-center gap-2 text-left text-[12px]">
                  <Checkbox checked={item.checked} />
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      {doc.versions[0]?.changeLog && (
        <div className="mt-3 rounded-md bg-[#f5f7f4] p-3 text-[12px] text-[#34413d]">
          <span className="font-semibold">Latest changelog: </span>{doc.versions[0].changeLog}
        </div>
      )}
      {dirty && (
        <div className="mt-3 flex items-center gap-2 border-t border-[#edf1ef] pt-3">
          <input
            value={changeLog}
            onChange={(e) => setChangeLog(e.target.value)}
            placeholder="What changed in this version?"
            className="h-9 flex-1 rounded-md border border-[#cfd8d4] bg-white px-3 text-[12px]"
          />
          <button
            onClick={publish}
            disabled={pending}
            className="h-9 shrink-0 rounded-md bg-[#0f9f95] px-4 text-[12px] font-semibold text-white disabled:opacity-50"
          >
            {pending ? "Publishing..." : "Publish New Version"}
          </button>
        </div>
      )}
    </Surface>
  );
}
