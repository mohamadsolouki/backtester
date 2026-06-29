import type { ContextTag, EntryPlan, Grade } from "@/lib/domain";

export function countConfirmations(tags: ContextTag[]) {
  return tags.reduce((total, tag) => total + (tag.enabled ? tag.weight : 0), 0);
}

export function computeGrade(confirmations: number, entries: EntryPlan[]): Grade {
  const takenEntries = entries.filter((entry) => entry.status === "Taken").length;
  const skippedPenalty = entries.some((entry) => entry.status === "Skipped") ? 1 : 0;
  const score = confirmations + takenEntries - skippedPenalty;

  if (score >= 8) return "A+";
  if (score >= 7) return "A";
  if (score >= 6) return "A-";
  if (score >= 5) return "B+";
  if (score >= 4) return "B";
  if (score >= 3) return "C";
  if (score >= 2) return "D";
  return "F";
}

export function gradeTone(grade: Grade) {
  if (grade.startsWith("A")) return "text-teal-700 bg-teal-50 border-teal-200";
  if (grade.startsWith("B")) return "text-amber-700 bg-amber-50 border-amber-200";
  return "text-red-700 bg-red-50 border-red-200";
}
