import { AsyncLocalStorage } from "node:async_hooks";
import { getPrismaClient } from "@sovia/sound/data/prisma";
import type { Prisma, PrismaClient } from "@/generated/prisma/client";

type ReviewTransaction = {
  client: PrismaClient;
  operationId: string;
};
const context = new AsyncLocalStorage<ReviewTransaction>();

export function getReviewClient() {
  const client = context.getStore()?.client ?? getPrismaClient();
  if (!client) throw new Error("Database is unavailable.");
  return client;
}

export function currentReviewOperationId() {
  return context.getStore()?.operationId;
}

export function isReviewTransaction() {
  return Boolean(context.getStore());
}

// Existing domain functions keep their transaction boundaries. Within an MCP
// commit they reuse the outer transaction so changes, audit and receipt commit
// together. No Prisma client is mutated and the context is request-local.
export function withReviewTransaction<T>(
  tx: Prisma.TransactionClient,
  operationId: string,
  run: () => Promise<T>,
) {
  const client = new Proxy(tx, {
    get(target, key) {
      if (key === "$transaction") {
        return (callback: unknown) => {
          if (typeof callback !== "function") {
            throw new Error("Nested review transactions require a callback.");
          }
          return callback(tx);
        };
      }
      const value = Reflect.get(target, key);
      return typeof value === "function" ? value.bind(target) : value;
    },
  }) as PrismaClient;
  return context.run({ client, operationId }, run);
}
