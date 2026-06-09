export function getFriendlyDatabaseError(error: unknown) {
  if (!process.env.DATABASE_URL) {
    return "DATABASE_URL is not configured. Set a PostgreSQL connection string in env before saving database overrides.";
  }

  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    if (
      message.includes("invalid") ||
      message.includes("url") ||
      message.includes("connection string")
    ) {
      return "DATABASE_URL looks invalid. Check the PostgreSQL connection string format.";
    }

    if (
      message.includes("authentication") ||
      message.includes("password") ||
      message.includes("permission denied")
    ) {
      return "PostgreSQL rejected the credentials. Check the user name, password, and database permissions.";
    }

    if (
      message.includes("connect") ||
      message.includes("econnrefused") ||
      message.includes("enotfound") ||
      message.includes("timeout")
    ) {
      return "Could not connect to PostgreSQL. Check the host, port, network access, and whether the database is running.";
    }

    if (message.includes("does not exist") || message.includes("relation")) {
      return "The PostgreSQL connection works, but the Prisma table is missing. Run pnpm db:push.";
    }
  }

  return "The database connection is not available. Check DATABASE_URL and PostgreSQL, then try again.";
}
