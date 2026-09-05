"use server";
import { getPrismaClient } from "@sovia/sound/data/prisma";
import { revalidatePath } from "next/cache";
import { requireAdminSession } from "./data/auth";
export async function markMailboxRead(form: FormData) {
  await requireAdminSession();
  const id = form.get("id");
  if (typeof id !== "string" || !id) throw new Error("Invalid message.");
  const prisma = getPrismaClient();
  if (!prisma) throw new Error("Database unavailable.");
  await prisma.mailboxMessage.update({
    where: { id },
    data: { readAt: new Date() },
  });
  revalidatePath("/admin/mailbox");
}
