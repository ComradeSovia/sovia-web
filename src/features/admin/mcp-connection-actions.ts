"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAuditActor } from "./data/auth";
import { revokeMcpConnection } from "./data/mcp-oauth";

export async function revokeMcpConnectionAction(form: FormData) {
  const actor = await requireAuditActor();
  const id = form.get("connectionId");
  if (
    typeof id !== "string" ||
    id.length > 200 ||
    form.get("confirm") !== "yes"
  ) {
    throw new Error("Select a connection and confirm revocation.");
  }
  await revokeMcpConnection(id, actor);
  revalidatePath("/admin/mcp");
  redirect("/admin/mcp?revoked=1");
}
