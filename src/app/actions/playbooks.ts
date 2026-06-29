"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

async function requireUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("Unauthorized");
  return session.user.id;
}

const playbookSchema = z.object({
  name: z.string().min(1),
  context: z.string().min(1),
  validConditions: z.array(z.string()),
  invalidConditions: z.array(z.string()),
  entryLogic: z.string(),
  exitLogic: z.string(),
  notes: z.string().optional(),
  active: z.boolean().default(true),
});

export async function getPlaybooks() {
  const userId = await requireUser();
  return prisma.playbookSetup.findMany({
    where: { userId },
    include: { screenshots: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function createPlaybook(input: z.infer<typeof playbookSchema>) {
  const userId = await requireUser();
  const data = playbookSchema.parse(input);

  const playbook = await prisma.playbookSetup.create({
    data: {
      userId,
      name: data.name,
      context: data.context,
      validConditions: data.validConditions,
      invalidConditions: data.invalidConditions,
      entryLogic: data.entryLogic,
      exitLogic: data.exitLogic,
      notes: data.notes,
      active: data.active,
    },
  });

  revalidatePath("/playbook");
  return playbook;
}

export async function updatePlaybook(id: string, input: Partial<z.infer<typeof playbookSchema>>) {
  const userId = await requireUser();
  const existing = await prisma.playbookSetup.findFirst({ where: { id, userId } });
  if (!existing) throw new Error("Not found");

  const playbook = await prisma.playbookSetup.update({
    where: { id },
    data: {
      ...(input.name ? { name: input.name } : {}),
      ...(input.context ? { context: input.context } : {}),
      ...(input.validConditions ? { validConditions: input.validConditions } : {}),
      ...(input.invalidConditions ? { invalidConditions: input.invalidConditions } : {}),
      ...(input.entryLogic ? { entryLogic: input.entryLogic } : {}),
      ...(input.exitLogic ? { exitLogic: input.exitLogic } : {}),
      ...(input.notes !== undefined ? { notes: input.notes } : {}),
      ...(input.active !== undefined ? { active: input.active } : {}),
    },
  });

  revalidatePath("/playbook");
  return playbook;
}

export async function deletePlaybook(id: string) {
  const userId = await requireUser();
  await prisma.playbookSetup.delete({ where: { id, userId } });
  revalidatePath("/playbook");
}
