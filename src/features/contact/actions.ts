"use server";

import { getPrismaClient } from "@sovia/sound/data/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const reference = z
  .string()
  .max(2000)
  .refine((value) => {
    if (!value) return true;
    try {
      return ["http:", "https:"].includes(new URL(value).protocol);
    } catch {
      return false;
    }
  });
const schema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("letter"),
    name: z.string().max(100).default(""),
    email: z.union([z.literal(""), z.email().max(254)]),
    body: z.string().min(1).max(10000),
  }),
  z.object({
    kind: z.literal("song"),
    songTitle: z.string().min(1).max(200),
    artist: z.string().max(200),
    url: reference,
    notes: z.string().max(3000),
  }),
]);
export type ContactState = { status: "idle" | "success" | "error" | "invalid" };
export async function submitContact(
  _previous: ContactState,
  form: FormData,
): Promise<ContactState> {
  if (form.get("website")) return { status: "invalid" };
  const values = Object.fromEntries(
    Array.from(form.entries()).map(([key, value]) => [
      key,
      typeof value === "string" ? value.trim() : value,
    ]),
  );
  const parsed = schema.safeParse(values);
  if (!parsed.success) return { status: "invalid" };
  try {
    const prisma = getPrismaClient();
    if (!prisma) return { status: "error" };
    const data = parsed.data;
    if (data.kind === "song") {
      await prisma.adminMusicTodo.create({
        data: {
          title: data.songTitle,
          sourceArtists: data.artist || null,
          sourceUrl: data.url || null,
          notes: data.notes || null,
          from: "Contact page",
          status: "PROPOSED",
          visible: false,
        },
      });
    } else {
      await prisma.mailboxMessage.create({
        data: {
          name: data.name,
          email: data.email || null,
          subject: "",
          body: data.body,
        },
      });
    }
  } catch {
    return { status: "error" };
  }
  revalidatePath("/admin/todo");
  revalidatePath("/admin/mailbox");
  return { status: "success" };
}
