import { existsSync } from "node:fs";
import { loadEnvFile } from "node:process";
import { defineConfig } from "prisma/config";

// Prisma 7 requires a Node version with native .env support.
if (existsSync(".env")) {
  loadEnvFile(".env");
}

export default defineConfig({
  schema: "prisma/schema",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Client generation is offline; database commands still require this URL.
    url: process.env.DATABASE_URL,
  },
});
