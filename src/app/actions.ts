"use server";

import { z } from "zod";
import { computeGrade, countConfirmations } from "@/lib/context-engine";
import { contextTagNames, skipReasons } from "@/lib/domain";

const contextTagSchema = z.object({
  name: z.enum(contextTagNames),
  enabled: z.boolean(),
  weight: z.number().int(),
});

const entrySchema = z.object({
  type: z.enum(["E1", "E2", "E3"]),
  status: z.enum(["Taken", "Skipped", "Not Formed", "Waiting"]),
  skipReason: z.enum(skipReasons).optional(),
});

export async function previewOpportunityGrade(input: unknown) {
  const parsed = z
    .object({
      contextTags: z.array(contextTagSchema),
      entries: z.array(entrySchema),
    })
    .parse(input);

  const confirmations = countConfirmations(parsed.contextTags);
  const grade = computeGrade(confirmations, parsed.entries);

  return { confirmations, grade };
}
