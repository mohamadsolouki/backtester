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

const reviewSchema = z.object({
  score: z.number().int().min(1).max(10),
  lesson: z.string().min(1),
  actionItem: z.string().optional(),
  tradeId: z.string().optional(),
  opportunityId: z.string().optional(),
});

export async function createReview(input: z.infer<typeof reviewSchema>) {
  const userId = await requireUser();
  const data = reviewSchema.parse(input);

  const review = await prisma.review.create({
    data: {
      userId,
      score: data.score,
      lesson: data.lesson,
      actionItem: data.actionItem,
      tradeId: data.tradeId || undefined,
      opportunityId: data.opportunityId || undefined,
    },
  });

  revalidatePath("/journal");
  revalidatePath("/opportunities");
  return review;
}

export async function updateReview(id: string, input: Partial<z.infer<typeof reviewSchema>>) {
  const userId = await requireUser();
  const existing = await prisma.review.findFirst({ where: { id, userId } });
  if (!existing) throw new Error("Not found");

  const review = await prisma.review.update({
    where: { id },
    data: {
      ...(input.score !== undefined ? { score: input.score } : {}),
      ...(input.lesson !== undefined ? { lesson: input.lesson } : {}),
      ...(input.actionItem !== undefined ? { actionItem: input.actionItem } : {}),
    },
  });

  revalidatePath("/journal");
  return review;
}

export async function deleteReview(id: string) {
  const userId = await requireUser();
  await prisma.review.delete({ where: { id, userId } });
  revalidatePath("/journal");
}
